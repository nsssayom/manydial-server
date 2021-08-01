import { Slot } from 'src/slots/entities/slot.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('calls')
export class Call {
    @PrimaryColumn()
    sid: string;

    @ManyToOne(() => Slot, (slot) => slot.calls, {
        /* eager: true, */
    })
    @JoinColumn({ name: 'slot_id' })
    slot: Slot;

    @ManyToOne(() => Order, (order) => order.calls, {
        /* eager: true, */
    })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    created_on: Date;

    @UpdateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    updated_on: Date;

    @Column({
        type: 'text',
        default: 'queued',
    })
    status: string;

    @Column({
        type: 'text',
    })
    to: string;

    @Column({
        type: 'text',
    })
    from: string;

    @Column({
        nullable: true,
    })
    start_time: Date;

    @Column({
        nullable: true,
    })
    end_time: Date;

    @Column({ nullable: true })
    duration: string;

    @Column({ nullable: true })
    price: string;

    @Column({ nullable: true })
    queue_time: string;
}
