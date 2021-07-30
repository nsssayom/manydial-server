import { json } from 'express';
import { Order } from 'src/orders/entities/order.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryColumn({ unique: true })
    uid: string;

    @Column({
        nullable: true,
    })
    date_of_birth: string;

    @Column({
        unique: true,
        nullable: true,
    })
    porichoy_id: string;

    @Column({ type: 'json', nullable: true })
    porichoy_response: any;

    @Column({
        default: false,
    })
    twilio_verified: boolean;

    @Column({
        default: '',
    })
    twilio_verification_call_sid: string;

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

    @Column({ type: 'varchar', length: 3000, nullable: true })
    internal_comment: JSON;

    @Column({ type: 'timestamptz', default: null, nullable: true })
    banned_on: Date;

    @Column({
        default: 10,
        nullable: true,
    })
    balance: number;

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];
}
