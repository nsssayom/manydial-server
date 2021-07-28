import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('slot')
export class Slot {
    @PrimaryGeneratedColumn()
    id: number;

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
    })
    cron_start_string: string;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdOn: Date;

    @Column({ type: 'varchar', length: 300, nullable: true })
    internalComment: string | null;

    @Column({ type: 'boolean', default: false })
    isMultiSlot: boolean;

    @Column({ type: 'boolean', default: true })
    active: boolean;
}
