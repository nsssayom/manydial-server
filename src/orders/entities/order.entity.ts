import { Slot } from 'src/slots/entities/slot.entity';
import { User } from 'src/users/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.orders)
    user: User;

    @Column({
        unique: true,
    })
    audio_url: string;

    @Column({
        array: true,
        type: 'text',
    })
    recipients: string[];

    @Column({ type: 'int', nullable: true })
    no_of_calls: number;

    @Column({ type: 'int', nullable: true })
    audio_length: number;

    @Column({ type: 'int', nullable: true })
    pulsed_call_length: number;

    @Column({ type: 'int', nullable: true })
    pulsed_total_mins: number;

    @Column({ nullable: true })
    cost_per_min: number;

    @Column({ nullable: true })
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
}
