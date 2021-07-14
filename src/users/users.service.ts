import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    // create new user
    async create(createUserDto: CreateUserDto): Promise<User> {
        const { gid, gid_type, phone, firebase_uuid, date_of_birth } =
            createUserDto;

        const user: User = new User();
        user.gid = gid;
        user.gid_type = gid_type;
        user.phone = phone;
        user.firebase_uuid = firebase_uuid;
        user.date_of_birth = date_of_birth;
        return await this.userRepository.save(user);
    }

    async findAll() {
        return await this.userRepository.find();
    }

    async findOne(id: number) {
        try {
            return await this.userRepository.findOneOrFail({
                where: { id: id },
            });
        } catch (error) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
    }

    /* update(id: number, updateUserDto: UpdateUserDto) {
        return `This action updates a #${id} user`;
    }

    remove(id: number) {
        return `This action removes a #${id} user`;
    } */
}
