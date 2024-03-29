import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { GetSlotDto } from './dto/get-slot.dto';
import { Slot } from './entities/slot.entity';

@Injectable()
export class SlotsService {
    constructor(
        @InjectRepository(Slot)
        private slotRepository: Repository<Slot>,
        private schedulerRegistry: SchedulerRegistry,
    ) {}

    private readonly logger = new Logger('SlotService');

    async getAllSlots() {
        // get existing time slots
        return await this.slotRepository.find({
            order: { end_time: 'ASC' },
        });
    }

    // A method to get slot ending time from preferred start time
    async getSlot(getSlotDto: GetSlotDto) {
        //console.log(getSlotDto);

        const { preferred_start_time, number_of_calls } = getSlotDto;

        const preferredStartDate = new Date(preferred_start_time);

        // calculate required time to finish calls
        let requiredTime = Math.ceil(
            number_of_calls / parseInt(process.env.CALL_PER_SEC),
        );

        //console.log('required time', requiredTime);

        // get existing time slots
        let engagedSlots = await this.slotRepository.find({
            where: {
                end_time: MoreThanOrEqual(preferred_start_time),
                /* start_time: LessThanOrEqual(
                    new Date(
                        preferredStartDate.valueOf() + requiredTime * 1000,
                    ),
                ), */
                //is_active: true,
            },

            order: { end_time: 'ASC' },
        });

        // console.log('engaged slots', engagedSlots.length, engagedSlots);

        const availableTimeSlots = [];

        if (Object.keys(engagedSlots).length === 0) {
            availableTimeSlots.push({
                slot_start_time: preferredStartDate,
                slot_end_time: new Date(
                    preferredStartDate.valueOf() + requiredTime * 1000,
                ),
            });
        } else {
            if (engagedSlots[0].start_time > preferredStartDate) {
                const slot = {};
                slot['slot_start_time'] = preferredStartDate;

                if (
                    engagedSlots[0].start_time.valueOf() -
                        preferredStartDate.valueOf() >=
                    requiredTime * 1000
                ) {
                    slot['slot_end_time'] = new Date(
                        preferredStartDate.valueOf() + requiredTime * 1000,
                    );
                    engagedSlots = [];
                } else {
                    slot['slot_end_time'] = engagedSlots[0].start_time;
                    requiredTime =
                        requiredTime -
                        (engagedSlots[0].start_time.valueOf() -
                            preferredStartDate.valueOf()) /
                            1000;
                }
                availableTimeSlots.push(slot);
            }
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

                // if slot available in-between
                if (availableTime > 0) {
                    const slotStartTime = new Date(
                        new Date(slot.end_time).valueOf(),
                    );
                    availableTimeSegment['slot_start_time'] = slotStartTime;

                    // if last slot not found
                    if (requiredTime > availableTime) {
                        availableTimeSegment['slot_end_time'] = new Date(
                            new Date(
                                engagedSlots[index + 1].start_time.valueOf(),
                            ),
                        );
                        //requiredTime = requiredTime - (availableTime + 1);
                        requiredTime = requiredTime - availableTime;
                    }
                    // if last slot found
                    else {
                        availableTimeSegment['slot_end_time'] = new Date(
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
                //console.log('clear slot');

                availableTimeSegment['slot_start_time'] = new Date(
                    new Date(slot.end_time.valueOf()),
                );
                availableTimeSegment['slot_end_time'] = new Date(
                    new Date(slot.end_time.valueOf() + requiredTime * 1000),
                );
            }
            if (Object.keys(availableTimeSegment).length > 0) {
                availableTimeSlots.push(availableTimeSegment);
            }
        });
        //return availableTimeSlots;

        // console.log('available slots', availableTimeSlots, '__');

        return await Promise.all(
            availableTimeSlots.map(async (slot) => {
                const milliseconds = parseInt(process.env.SLOT_CHECK_TIMEOUT);

                const slot_obj = new Slot();
                slot_obj.start_time = slot.slot_start_time;
                slot_obj.end_time = slot.slot_end_time;
                slot_obj.is_active = false;
                slot_obj.call_count =
                    ((slot.slot_end_time.valueOf() -
                        slot.slot_start_time.valueOf()) *
                        parseInt(process.env.CALL_PER_SEC)) /
                    1000;
                slot_obj.expires_on = new Date(
                    new Date().valueOf() + milliseconds,
                );

                const saved_object = await this.slotRepository.save(slot_obj);
                if (saved_object) {
                    // Callback method to check after time-out if the slot has been activated.
                    // Otherwise, it will be deleted.
                    const callback = async () => {
                        const slot = await this.slotRepository.findOne({
                            where: {
                                id: saved_object.id,
                                is_active: false,
                            },
                        });
                        if (slot) {
                            await this.slotRepository.delete(slot.id);
                            this.logger.log(
                                `❌ Deleting slot ${slot.id} for being inactive after timeout`,
                            );
                        } else {
                            this.logger.log(
                                `✅ Slot ${saved_object.id} is keep active after timeout`,
                            );
                        }
                    };
                    const timeout = setTimeout(callback, milliseconds);
                    // Add the timeout to the scheduler registry with callback to be called after the timeout
                    this.schedulerRegistry.addTimeout(
                        'slot_check_timeout_' + saved_object.id,
                        timeout,
                    );
                    return saved_object;
                } else {
                    throw new HttpException(
                        'Internal Server Error',
                        HttpStatus.INTERNAL_SERVER_ERROR,
                    );
                }
            }),
        );
    }
}
