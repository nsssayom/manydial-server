import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Inject,
    UseGuards,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { GetSlotEndingTimeDto } from './dto/get-slot-ending-time.dto';
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

    @Get()
    getSlotEndingTime(@Body() getSlotEndingTimeDto: GetSlotEndingTimeDto) {
        return this.slotsService.getSlotEndingTime(getSlotEndingTimeDto);
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
