import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Req,
    Get,
    Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/multer.config';
import { AuthGuard } from '@nestjs/passport';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post()
    @UseGuards(AuthGuard('firebase'))
    @UseInterceptors(FileInterceptor('audio', multerOptions))
    create(
        @Req() request,
        @UploadedFile() audio_file,
        @Body() createOrderDto: CreateOrderDto,
    ) {
        return this.ordersService.create(
            request.user.firebase_user,
            audio_file,
            createOrderDto,
        );
    }

    @Post('calls/status')
    updateCallStatus(@Body() callbackResponse: any) {
        console.log('callback', callbackResponse);
        return this.ordersService.updateCallStatus(callbackResponse);
    }

    /*     @Get()
    findAll() {
        return this.ordersService.findAll();
    }
    */

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ordersService.findOne(id);
    }
    /*
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.ordersService.remove(+id);
    } */
}
