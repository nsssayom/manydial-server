import { Order } from 'src/orders/entities/order.entity';
import { Call } from 'src/orders/entities/call.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('slots')
export class Slot {
    constructor(obj?: any) {
        obj ? obj && Object.assign(this, obj) : null;
    }

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Order, (order) => order.slots, {
        nullable: true,
        /* eager: true, */
    })
    @JoinColumn({ name: 'order_id' })
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
        array: true,
        type: 'text',
        nullable: true,
    })
    recipients: string[];

    @Column({
        type: 'int',
    })
    call_count: number;

    @Column({
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

    @OneToMany(() => Call, (call) => call.slot)
    calls: Call[];
}
