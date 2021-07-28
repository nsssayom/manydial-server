import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { GetSlotEndingTimeDto } from './dto/get-slot-ending-time.dto';
import { Slot } from './entities/slot.entity';

@Injectable()
export class SlotsService {
    constructor(
        @InjectRepository(Slot)
        private slotRepository: Repository<Slot>,
    ) {}

    async getAllSlots() {
        // get existing time slots
        return await this.slotRepository.find({
            order: { end_time: 'ASC' },
        });
    }

    // A method to get slot ending time from preferred start time
    async getSlotEndingTime(getSlotEndingTimeDto: GetSlotEndingTimeDto) {
        const { preferred_start_time, number_of_calls } = getSlotEndingTimeDto;

        const preferredStartDate = new Date(preferred_start_time);

        // calculate required time to finish calls
        let requiredTime = Math.ceil(
            number_of_calls / parseInt(process.env.CALL_PER_SEC),
        );

        console.log('required time', requiredTime);

        // get existing time slots
        const engagedSlots = await this.slotRepository.find({
            where: {
                end_time: MoreThanOrEqual(preferred_start_time),
                active: true,
            },
            order: { end_time: 'ASC' },
        });

        const availableTimeSlots = [];

        if (Object.keys(engagedSlots).length === 0) {
            availableTimeSlots.push({
                slot_start_time: preferredStartDate,
                slot_end_time: new Date(
                    preferredStartDate.valueOf() + requiredTime * 1000 + 1000,
                ),
            });
        }

        engagedSlots.some(function (slot, index) {
            const availableTimeSegment = {};

            // if next engaged slot available
            if (typeof engagedSlots[index + 1] !== 'undefined') {
                // calculate available time in-between slots
                const availableTime =
                    (new Date(engagedSlots[index + 1].start_time).valueOf() -
                        new Date(slot.end_time).valueOf()) /
                    1000;

                console.log('available time', availableTime, 'in index', index);

                // if slot available in-between
                if (availableTime > 0) {
                    const slotStartTime = new Date(
                        new Date(slot.end_time).valueOf() + 1000,
                    );
                    console.log('slot start time', slotStartTime);

                    availableTimeSegment['slot_start_time'] = slotStartTime;

                    // if last slot not found
                    if (requiredTime > availableTime) {
                        availableTimeSegment['slot_end_time'] = new Date(
                            new Date(
                                engagedSlots[index + 1].start_time.valueOf() -
                                    1000,
                            ),
                        );
                        requiredTime = requiredTime - (availableTime + 1);
                    }
                    // if last slot found
                    else {
                        availableTimeSegment['_slot_end_time'] = new Date(
                            slotStartTime.valueOf() + requiredTime * 1000,
                        );
                        requiredTime = 0;
                        availableTimeSlots.push(availableTimeSegment);
                        return true;
                    }
                }
            }
            // if there is no next slot
            else {
                availableTimeSegment['slot_start_time'] = new Date(
                    new Date(slot.end_time.valueOf() + 1000),
                );
                availableTimeSegment['slot_end_time'] = new Date(
                    new Date(
                        slot.end_time.valueOf() + requiredTime * 1000 + 1000,
                    ),
                );
            }
            if (Object.keys(availableTimeSegment).length > 0) {
                availableTimeSlots.push(availableTimeSegment);
            }
        });

        return availableTimeSlots;
    }
}
