import {
    Controller,
    Post,
    Body,
    Inject,
    UseGuards,
    Req,
    HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyPorichoyDto } from './dto/verify-porichoy.dto.';
import {
    FirebaseAdminSDK,
    FIREBASE_ADMIN_INJECT,
} from '@tfarras/nestjs-firebase-admin';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        @Inject(FIREBASE_ADMIN_INJECT)
        private readonly fireSDK: FirebaseAdminSDK,
    ) {}

    @Post('auth')
    @UseGuards(AuthGuard('firebase'))
    create(/*@Body() createUserDto: CreateUserDto,*/ @Req() request) {
        return this.usersService.userAuth(
            //createUserDto,
            request.user.firebase_user,
        );
    }

    /*  @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(+id);
    } */

    @Post('auth/porichoy')
    @HttpCode(202)
    @UseGuards(AuthGuard('firebase'))
    verifyPorichoy(
        @Body() verifyPorichoyDto: VerifyPorichoyDto,
        @Req() request,
    ) {
        return this.usersService.verifyPorichoy(
            verifyPorichoyDto,
            request.user.firebase_user,
        );
    }

    @Post('auth/self')
    @HttpCode(202)
    @UseGuards(AuthGuard('firebase'))
    verifyTwilio(@Req() request) {
        return this.usersService.verifyTwilio(request.user.firebase_user);
    }

    @Post('auth/twilio/callback')
    twilioCallback(@Body() response: any) {
        return this.usersService.twilioCallback(response);
    }

    /* 
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(+id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(+id);
    } */
}
