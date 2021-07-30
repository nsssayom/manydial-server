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

    @Column({
        unique: true,
        nullable: true,
    })
    audio_url: Date;

    @Column({
        array: true,
        type: 'text',
    })
    recipients: string[];

    @OneToMany(() => Slot, (slot) => slot.id)
    slots: Slot[];

    @Column({ type: 'int' })
    no_of_calls: number;

    @Column({ type: 'int' })
    audio_length: number;

    @Column({ type: 'int' })
    pulsed_call_length: number;

    @Column({ type: 'int' })
    pulsed_total_mins: number;

    @Column()
    cost_per_min: number;

    @Column()
    total_cost: number;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    created_on: Date;

    @Column({ default: 'QUEUED' })
    order_status: string;

    @ManyToOne(() => User, (user) => user.orders)
    user: User;
}
