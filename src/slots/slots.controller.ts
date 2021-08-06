import { Controller, Get, Body, Inject, UseGuards, Post } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { GetSlotDto } from './dto/get-slot.dto';
import {
    FirebaseAdminSDK,
    FIREBASE_ADMIN_INJECT,
} from '@tfarras/nestjs-firebase-admin';
import { AuthGuard } from '@nestjs/passport';

@Controller('slots')
export class SlotsController {
    constructor(
        private readonly slotsService: SlotsService,
        @Inject(FIREBASE_ADMIN_INJECT)
        private readonly fireSDK: FirebaseAdminSDK,
    ) {}

    /*@Post()
    create(@Body() createSlotDto: CreateSlotDto) {
        return this.slotsService.create(createSlotDto);
    }

    @Get()
    findAll(@Body() getSlotEndingTimeDto: GetSlotEndingTimeDto) {
        return this.slotsService.getSlotEndingTime(getSlotEndingTimeDto);
    }
    */

    @Get('all')
    @UseGuards(AuthGuard('firebase'))
    getAllSlots() {
        return this.slotsService.getAllSlots();
    }

    @Post()
    @UseGuards(AuthGuard('firebase'))
    getSlotEndingTime(@Body() getSlotDto: GetSlotDto) {
        return this.slotsService.getSlot(getSlotDto);
    }

    /*     @Get(':id')
    findOne(@Param('id') id: string) {
        return this.slotsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSlotDto: UpdateSlotDto) {
        return this.slotsService.update(+id, updateSlotDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.slotsService.remove(+id);
    } */
}
