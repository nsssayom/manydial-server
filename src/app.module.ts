import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection, getConnectionOptions } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SlotsModule } from './slots/slots.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { FirebaseAdminModule } from '@tfarras/nestjs-firebase-admin';
import { AuthModule } from './auth/auth.module';
import * as admin from 'firebase-admin';
import { TwilioModule } from 'nestjs-twilio';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useFactory: async () =>
                Object.assign(await getConnectionOptions(), {
                    autoLoadEntities: true,
                }),
        }),
        /* TwilioModule.forRoot({
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
        }), */
        TwilioModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (cfg: ConfigService) => ({
                accountSid: cfg.get('TWILIO_ACCOUNT_SID'),
                authToken: cfg.get('TWILIO_AUTH_TOKEN'),
            }),
            inject: [ConfigService],
        }),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        UsersModule,
        SlotsModule,
        FirebaseAdminModule.forRootAsync({
            useFactory: () => ({
                credential: admin.credential.applicationDefault(),
            }),
        }),
        AuthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
    constructor(private connection: Connection) {}
}
