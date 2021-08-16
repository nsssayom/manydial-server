import {
    Controller,
    Get,
    Inject,
    Redirect,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    FirebaseAdminSDK,
    FIREBASE_ADMIN_INJECT,
} from '@tfarras/nestjs-firebase-admin';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        @Inject(FIREBASE_ADMIN_INJECT)
        private readonly fireSDK: FirebaseAdminSDK,
    ) {}

    @Get('public/audio')
    @Redirect('https://manydial.com', 301)
    redirect() {
        return;
    }
    /* @UseGuards(AuthGuard('firebase'))
    getHello(@Req() request): any {
        return this.appService.getHello();
        console.log(request.user);
        return request.user;
    } */
}
