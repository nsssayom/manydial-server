import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    gid: string;

    @Column()
    gid_type: string;

    @Column({
        unique: true,
    })
    phone: string;

    @Column({
        unique: true,
    })
    firebase_uuid: string;

    @Column({
        nullable: true,
    })
    date_of_birth: Date;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createDateTime: Date;

    @UpdateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    lastChangedDateTime: Date;

    @Column({ type: 'varchar', length: 300, nullable: true })
    internalComment: string | null;

    @Column({
        default: 10,
        nullable: true,
    })
    balance: number;

    @Column({ type: 'boolean', default: false })
    isBanned: boolean;
}
