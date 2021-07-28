import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { FirebaseUser } from '@tfarras/nestjs-firebase-admin';
import { FirebaseAuthStrategy } from '@tfarras/nestjs-firebase-auth';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(
    FirebaseAuthStrategy,
    'firebase',
) {
    public constructor() {
        super({
            extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    // returning firebase user object
    async validate(payload: FirebaseUser): Promise<any> {
        return {
            firebase_user: payload,
        };
    }
}
