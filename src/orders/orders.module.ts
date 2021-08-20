import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Slot } from 'src/slots/entities/slot.entity';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
import { PhoneNumberUtil } from 'google-libphonenumber';
@Module({
    imports: [TypeOrmModule.forFeature([Order, Slot, Call, User])],
    controllers: [OrdersController],
    providers: [OrdersService, PhoneNumberUtil],
})
export class OrdersModule {}
