import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Slot } from 'src/slots/entities/slot.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Order, Slot])],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
