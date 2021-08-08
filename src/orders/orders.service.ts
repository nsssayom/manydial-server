import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Slot } from 'src/slots/entities/slot.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { getAudioDurationInSeconds } from 'get-audio-duration';
//import { getVideoDurationInSeconds } from 'get-video-duration';
import { InjectTwilio, TwilioClient } from 'nestjs-twilio';
import VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
//import { exec as childProcessExec } from 'child_process';

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
    ) {}

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
                        console.log(
                            `Initiated call to ${recipient} with sid: ${call.sid}`,
                        );
                    })
                    .catch((err) => {
                        console.log(err);
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
        console.log(createOrderDto.slots);
        const { recipients, slots } = createOrderDto;
        const recipients_arr = recipients.split(',');
        const order = new Order();
        order.recipients = recipients;
        order.no_of_calls = recipients_arr.length;

        order.slots = await Promise.all(
            JSON.parse(slots).map(async (slot: any) => {
                const slot_obj = new Slot(slot);
                slot_obj.recipients = recipients_arr.splice(
                    0,
                    slot_obj.call_count,
                );
                return await this.slotRepository.save(slot_obj);
            }),
        );
        order.user = firebaseUser.uid;
        order.audio_url = process.env.PUBLIC_AUDIO_BASE_URL + file.filename;

        console.log(file);

        /* if (file.mimetype === 'audio/webm') {
            audioDurationInSeconds = Math.ceil(
                await getVideoDurationInSeconds(file.path),
            );
        } else {
            audioDurationInSeconds = Math.ceil(
                await getAudioDurationInSeconds(file.path),
            );
        } */

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
                return parseFloat(process.env.CALL_RATE_TIER_1);
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

        const user = await this.userRepository.findOne(firebaseUser.uid);

        if (order.total_cost > user.balance) {
            throw new HttpException(
                'Insufficient Balance',
                HttpStatus.FORBIDDEN,
            );
        }

        const placed_order = await this.orderRepository.save(order);
        placed_order.slots.forEach(async (slot: Slot) => {
            user.balance -= order.total_cost;
            await this.userRepository.save(user);
            this.initiateCall(slot, placed_order, firebaseUser);
        });
        return placed_order;
    }

    async updateCallStatus(callbackResponse: any) {
        const call = await this.callRepository.findOne({
            sid: callbackResponse.CallSid,
        });
        if (call) {
            call.status = callbackResponse.CallStatus;
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
