import { Slot } from 'src/slots/entities/slot.entity';
import { User } from 'src/users/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.orders, {
        /*  eager: true */
    })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        unique: true,
    })
    audio_url: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    recipients: string;

    @Column({ type: 'int' })
    no_of_calls: number;

    @Column({ type: 'int' })
    audio_length: number;

    @Column({ type: 'int' })
    pulsed_call_length: number;

    @Column({ type: 'int' })
    pulsed_total_mins: number;

    @Column({ type: 'float', nullable: true })
    cost_per_min: number;

    @Column({ type: 'float', nullable: true })
    total_cost: number;

    @Column({ default: 'QUEUED' })
    order_status: string;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    created_on: Date;

    @OneToMany(() => Slot, (slot) => slot.order)
    slots: Slot[];

    @OneToMany(() => Call, (call) => call.slot)
    calls: Call[];
}
