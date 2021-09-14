import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Slot } from 'src/slots/entities/slot.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { InjectTwilio, TwilioClient } from 'nestjs-twilio';
import VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
import { PhoneNumberUtil } from 'google-libphonenumber';

import fs = require('fs');
import ffmpegPath = require('@ffmpeg-installer/ffmpeg');
import ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath.path);

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(Slot)
        private slotRepository: Repository<Slot>,
        @InjectRepository(Call)
        private callRepository: Repository<Call>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectTwilio()
        private readonly twilioClient: TwilioClient,
        private schedulerRegistry: SchedulerRegistry,
        private phoneUtil: PhoneNumberUtil = PhoneNumberUtil.getInstance(),
    ) {}

    private readonly logger = new Logger('OrderService');

    initiateCall(slot: Slot, order: Order, firebaseUser: any) {
        const voiceResponse = new VoiceResponse();
        voiceResponse.play(order.audio_url);
        slot.recipients.map((recipient) => {
            const job = new CronJob(new Date(slot.start_time), () => {
                this.twilioClient.calls
                    .create({
                        to: recipient,
                        callerId: firebaseUser.phone_number,
                        from: firebaseUser.phone_number,
                        twiml: voiceResponse.toString(),
                        statusCallback:
                            process.env.TWILIO_CALL_STATUS_CALLBACK_URL,
                        statusCallbackMethod: 'POST',
                    })
                    .then(async (call) => {
                        const _call = new Call();

                        _call.sid = call.sid;
                        _call.to = call.to;
                        _call.from = call.from;
                        _call.status = call.status;
                        _call.start_time = call.startTime;
                        _call.end_time = call.endTime;
                        _call.duration = call.duration;
                        _call.price = call.price;
                        _call.queue_time = call.queueTime;
                        _call.slot = slot;
                        _call.order = order;
                        await this.callRepository.save(_call);
                        this.logger.log(
                            `📞 Initiated call to ${recipient} with sid: ${call.sid}`,
                        );
                    })
                    .catch((err) => {
                        this.logger.error(err.message);
                        throw new HttpException(
                            'Internal Server Error',
                            HttpStatus.INTERNAL_SERVER_ERROR,
                        );
                    });
            });
            this.schedulerRegistry.addCronJob(
                `${order.id}-${slot.id}-${recipient}`,
                job,
            );
            job.start();
            //console.log(`Initiating call for slot #${slot.id}`);
            //console.log(this.schedulerRegistry.getCronJobs());
            //this.schedulerRegistry.deleteCronJob('generateCall');
        });
    }

    async create(firebaseUser: any, file: any, createOrderDto: CreateOrderDto) {
        const { recipients, slots } = createOrderDto;
        // Spliting recipients by "," token
        const recipients_arr = recipients.split(',');

        const user = await this.userRepository.findOne(firebaseUser.uid);

        if (
            !recipients_arr.every((recipient) => {
                return this.phoneUtil.isValidNumberForRegion(
                    this.phoneUtil.parse(recipient, user.country_code),
                    user.country_code,
                );
            })
        ) {
            this.logger.error(
                `Discared order by user ${user.uid} as international or invalid recipient was detected`,
            );
            throw new HttpException(
                'International or invalid recipient(s) are not allowed',
                HttpStatus.BAD_REQUEST,
            );
        }

        const order = new Order();
        order.recipients = recipients;

        order.no_of_calls = recipients_arr.length;

        // A potential bug here that has been supressed using the following line @ts-ignore
        // @ts-ignore
        order.slots = await Promise.all(
            JSON.parse(slots).map(async (slot: any) => {
                const slot_obj = new Slot(slot);
                slot_obj.is_active = true;
                slot_obj.recipients = recipients_arr.splice(
                    0,
                    slot_obj.call_count,
                );
                return await this.slotRepository.save(slot_obj);
            }),
        );
        order.user = firebaseUser.uid;

        // Convert the audio file to mono mp3
        const convertedFileName: string = file.filename.split('.')[0] + '.mp3';

        await ffmpeg({ source: file.path })
            .addOption('-ac', '1')
            .on('end', () => {
                this.logger.debug(
                    `Converted audio file ${file.filename} to mono mp3`,
                );

                // Delete the original audio file
                fs.unlink(file.path, (err) => {
                    if (err) {
                        this.logger.error(err.message);
                        throw new HttpException(
                            'Internal Server Error',
                            HttpStatus.INTERNAL_SERVER_ERROR,
                        );
                    }
                });
            })
            .saveToFile('public/audio/' + convertedFileName);

        order.audio_url = process.env.PUBLIC_AUDIO_BASE_URL + convertedFileName;

        const audioDurationInSeconds = Math.ceil(
            await getAudioDurationInSeconds(file.path),
        );

        order.audio_length = audioDurationInSeconds;
        order.pulsed_call_length = Math.ceil(audioDurationInSeconds / 60);
        order.pulsed_total_mins = order.pulsed_call_length * order.no_of_calls;
        order.cost_per_min = (function () {
            if (
                order.no_of_calls <=
                parseInt(process.env.CALL_RATE_TIER_1_LIMIT)
            ) {
                return Number(parseFloat(process.env.CALL_RATE_TIER_1));
            } else if (
                order.no_of_calls >=
                    parseInt(process.env.CALL_RATE_TIER_1_LIMIT) &&
                order.no_of_calls <=
                    parseInt(process.env.CALL_RATE_TIER_2_LIMIT)
            ) {
                return parseFloat(process.env.CALL_RATE_TIER_2);
            } else if (
                order.no_of_calls >=
                    parseInt(process.env.CALL_RATE_TIER_2_LIMIT) &&
                order.no_of_calls <=
                    parseInt(process.env.CALL_RATE_TIER_3_LIMIT)
            ) {
                return parseFloat(process.env.CALL_RATE_TIER_3);
            } else {
                return parseFloat(process.env.CALL_RATE_TIER_4);
            }
        })();
        order.total_cost = order.pulsed_total_mins * order.cost_per_min;

        if (order.total_cost > user.balance) {
            this.logger.error(
                `User ${user.uid} tried to place order with insufficient balance`,
            );
            throw new HttpException(
                'Insufficient Balance',
                HttpStatus.FORBIDDEN,
            );
        }

        const placed_order = await this.orderRepository.save(order);
        this.logger.log(
            `Order ${order.id} successfully placed by user ${user.uid}`,
        );
        placed_order.slots.forEach(async (slot: Slot) => {
            user.balance -= order.total_cost;
            await this.userRepository.save(user);
            this.initiateCall(slot, placed_order, firebaseUser);
        });

        // Return the order
        return placed_order;
    }

    async updateCallStatus(callbackResponse: any) {
        const call = await this.callRepository.findOne({
            sid: callbackResponse.CallSid,
        });
        if (call) {
            this.logger.log(
                `📞 Call ${call.sid} updated status to ${callbackResponse.CallStatus} from ${call.status}`,
            );
            call.status = callbackResponse.CallStatus;
            if (
                call.status === 'failed' ||
                call.status === 'no-answer' ||
                call.status === 'busy'
            ) {
                const order = await this.orderRepository.findOne(call.order);
                const user = await this.userRepository.findOne(order.user);
                // Return the balance to the user for the failed calls
                user.balance += order.cost_per_min * order.pulsed_call_length;
                this.logger.log(
                    `💵 Credit ${
                        order.cost_per_min * order.pulsed_call_length
                    } returned to ${user.uid} for a failed call to ${call.to}`,
                );
                await this.userRepository.save(user);
            }
            call.duration = callbackResponse.CallDuration;
            call.from = callbackResponse.From;
            await this.callRepository.save(call);
        }
    }

    findAll() {
        return `This action returns all orders`;
    }

    async findOne(id: string) {
        const order = await this.orderRepository.findOne(id);
        order.slots = await this.slotRepository.find({
            where: {
                order: order,
            },
        });
        order.calls = await this.callRepository.find({
            where: {
                order: order,
            },
        });
        return order;
    }

    /*     update(id: number, updateOrderDto: UpdateOrderDto) {
        return `This action updates a #${id} order`;
    } */

    remove(id: number) {
        return `This action removes a #${id} order`;
    }
}
