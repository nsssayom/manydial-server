import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Slot } from 'src/slots/entities/slot.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { env } from 'process';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(Slot)
        private slotRepository: Repository<Slot>,
    ) {}

    async create(firebaseUser: any, file: any, createOrderDto: CreateOrderDto) {
        const { recipients, slots } = createOrderDto;
        const recipients_arr = recipients.split(',');
        const order = new Order();

        order.recipients = recipients_arr;
        order.no_of_calls = recipients_arr.length;

        order.slots = JSON.parse(slots).map((slot: any) => {
            return new Slot(slot);
        });
        order.user = firebaseUser.uid;
        order.audio_url = process.env.PUBLIC_AUDIO_BASE_URL + file.filename;
        console.log(file);

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

        return await this.orderRepository.save(order);
    }

    findAll() {
        return `This action returns all orders`;
    }

    findOne(id: number) {
        return `This action returns a #${id} order`;
    }

    /*     update(id: number, updateOrderDto: UpdateOrderDto) {
        return `This action updates a #${id} order`;
    } */

    remove(id: number) {
        return `This action removes a #${id} order`;
    }
}
