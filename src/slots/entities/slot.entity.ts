import { Order } from 'src/orders/entities/order.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('slot')
export class Slot {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Order, (order) => order.slots, {
        nullable: true,
        eager: true,
    })
    order: Order;

    @Column({
        unique: true,
        type: 'timestamptz',
    })
    start_time: Date;

    @Column({
        unique: true,
        type: 'timestamptz',
    })
    end_time: Date;

    @Column({
        unique: true,
        type: 'timestamptz',
        nullable: true,
    })
    expires_on: Date;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    created_on: Date;

    @Column({ type: 'boolean', default: false })
    is_active: boolean;
}
