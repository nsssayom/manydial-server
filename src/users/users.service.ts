import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FirebaseUser } from '@tfarras/nestjs-firebase-admin';
import { InjectTwilio, TwilioClient } from 'nestjs-twilio';
import { lastValueFrom, map } from 'rxjs';
import { Repository } from 'typeorm';
import { VerifyPorichoyDto } from './dto/verify-porichoy.dto.';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private httpService: HttpService,
        @InjectTwilio()
        private readonly twilioClient: TwilioClient,
    ) {}

    private readonly logger = new Logger('UserService');

    // returns user object id exists in db, create if not
    async userAuth(
        /*createUserDto: CreateUserDto,*/ firebaseUser: FirebaseUser,
    ): Promise<User> {
        const _user = await this.userRepository.findOne({
            where: { uid: firebaseUser.uid },
        });

        // if user already exist in db
        if (_user) {
            this.logger.log(
                `Existing user authenticated with Firebase UID ${_user.uid} & Phonenumber ${_user.phone_number}`,
            );
            return _user;
        }
        // if user does not exist in db
        else {
            /* fetching country code from twilio phone number validation and formatting lookup
               for reference: https://www.twilio.com/docs/lookup/tutorials/validation-and-formatting
            */
            return this.twilioClient.lookups.v1
                .phoneNumbers(firebaseUser.phone_number)
                .fetch()
                .then(async (phoneInfo) => {
                    const restrictedCountries =
                        process.env.RESTRICTED_COUNTRIES.split(',');
                    // if user is from a restricted country
                    if (restrictedCountries.includes(phoneInfo.countryCode)) {
                        this.logger.warn(
                            `Authention request denied for Firebase UID ${firebaseUser.uid} originated from restricted country ${phoneInfo.countryCode}`,
                        );
                        throw new HttpException(
                            'User is from a restricted country',
                            HttpStatus.FORBIDDEN,
                        );
                    }

                    // if user is from a non-restricted country
                    const user: User = new User();
                    user.uid = firebaseUser.uid;
                    user.phone_number = firebaseUser.phone_number;
                    user.country_code = phoneInfo.countryCode;

                    // Check if user already has a verified twilio sender id
                    await this.twilioClient.outgoingCallerIds
                        .list({
                            phoneNumber: firebaseUser.phone_number,
                            limit: 1,
                        })
                        .then((/* callerId */) => {
                            user.twilio_verified = true;
                        });

                    const new_user = await this.userRepository.save(user);
                    this.logger.log(
                        `New user created and authenticated with Firebase UID ${new_user.uid} & Phonenumber ${new_user.phone_number}`,
                    );
                    return new_user;
                });
        }
    }

    async verifyPorichoy(
        verifyPorichoyDto: VerifyPorichoyDto,
        firebaseUser: any,
    ) {
        const { porichoy_id, date_of_birth } = verifyPorichoyDto;

        // fetching user from db by firebase uid
        const user: User = await this.userRepository.findOne({
            where: { uid: firebaseUser.uid },
        });

        // if NID already verified
        if (user && user.porichoy_id === porichoy_id) {
            if (user.date_of_birth === date_of_birth) {
                return user;
            } else {
                throw new HttpException(
                    'Invalid NID and Date of Birth combination',
                    HttpStatus.CONFLICT,
                );
            }
        }

        // fetching user from db by nid
        const _user: User = await this.userRepository.findOne({
            where: { porichoy_id: porichoy_id },
        });

        // if NID already bound to other user
        if (_user && _user.uid !== firebaseUser.uid) {
            throw new HttpException(
                'NID associated with another account',
                HttpStatus.CONFLICT,
            );
        }

        // it is possible that user has a legal NID but it is not registered in db
        // verifying NID from porichoy and saving it to db
        const response = this.httpService
            .post(
                process.env.PORICHOY_ENDPOINT,
                {
                    national_id: porichoy_id,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.PORICHOY_API_KEY,
                    },
                },
            )
            .pipe(
                map((res) => {
                    return res.data;
                }),
            );

        // converting rxjs observable to promise
        return await lastValueFrom(response)
            .then(async (res) => {
                if (res.passKyc === 'yes' && res.voter.dob === date_of_birth) {
                    // NID Verified, save to database
                    const user: User = new User();
                    user.uid = firebaseUser.uid;
                    user.phone_number = firebaseUser.phone_number;
                    user.porichoy_id = porichoy_id;
                    user.date_of_birth = date_of_birth;
                    user.porichoy_response = res.voter;
                    try {
                        return await this.userRepository.save(user);
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    throw new HttpException(
                        'Invalid NID and Date of Birth combination',
                        HttpStatus.CONFLICT,
                    );
                }
            })
            .catch((err) => {
                if (err.status === HttpStatus.CONFLICT) {
                    throw err;
                }

                throw new HttpException(
                    err.response.data.message
                        ? err.response.data.message
                        : 'Invalid response from Porichoy server',
                    HttpStatus.BAD_REQUEST,
                );
            });
    }

    // Method to initiate outgoing caller id verification call
    async verifyTwilio(firebaseUser: any) {
        // Fetching user from db by firebase uid
        const user: User = await this.userRepository.findOne({
            where: { uid: firebaseUser.uid },
        });

        // if user is not authenticated
        if (!user) {
            this.logger.warn(
                `User not found with Firebase UID ${firebaseUser.uid}`,
            );
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Check if user already has a verified twilio sender id
        const updated_user = await this.twilioClient.outgoingCallerIds
            .list({
                phoneNumber: firebaseUser.phone_number,
                limit: 1,
            })
            .then((callerId) => {
                //update twilio verified status
                console.log(callerId);
                if (callerId && callerId.length > 0) {
                    user.twilio_verified = true;
                } else {
                    user.twilio_verified = false;
                }
                return this.userRepository.save(user);
            })
            .catch((err) => {
                this.logger.error(err);
                throw new HttpException(
                    'Error fetching sender IDs',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            });

        if (updated_user.twilio_verified) {
            this.logger.log(
                `Twilio outgoing called ID already verified for Firebase UID ${firebaseUser.uid} & Phonenumber ${user.phone_number}`,
            );
            throw new HttpException(
                'Twilio outgoing caller ID already verified',
                HttpStatus.CONFLICT,
            );
        }

        // Sending request to twilio to verify sender id
        return await this.twilioClient.validationRequests
            .create({
                friendlyName: firebaseUser.uid,
                phoneNumber: firebaseUser.phone_number,
                callDelay: 0,
                statusCallback: process.env.TWILIO_VERIFICATION_CALLBACK_URL,
            })
            .then(async (validationRequest) => {
                const user: User = new User();
                user.uid = firebaseUser.uid;
                user.phone_number = firebaseUser.phone_number;
                user.twilio_verification_call_sid = validationRequest.callSid;
                this.logger.log(
                    `Validation call ${validationRequest.callSid} initiate for User ${firebaseUser.uid}`,
                );
                await this.userRepository.save(user); // inserting callSid to db
                return validationRequest;
            })
            .catch((err) => {
                this.logger.log(
                    `Validation request failed for User ${firebaseUser.uid}`,
                    err,
                );
                throw new HttpException(
                    'Verification service returned an error',
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            });
    }

    // Method to receive callback from Twilio
    async twilioCallback(response) {
        this.logger.log(
            `Twilio verificationStatus ${response.VerificationStatus} recieved for CallSid ${response.CallSid}`,
        );
        if (response.VerificationStatus === 'success') {
            const user: User = await this.userRepository.findOne({
                where: {
                    twilio_verification_call_sid: response.CallSid,
                },
            });

            if (user) {
                user.twilio_verified = true;
                await this.userRepository.save(user);
                this.logger.log(
                    `Twilio verification successful for user ${user.uid}`,
                );
            }
        } else {
            // Verification failed
            const user: User = await this.userRepository.findOne({
                where: {
                    twilio_verification_call_sid: response.CallSid,
                },
            });

            if (user) {
                user.twilio_verified = false;
                user.twilio_verification_call_sid = '';
                await this.userRepository.save(user);
                this.logger.error(
                    `Twilio failed verification response resolved to user ${user.uid}`,
                );
            }
        }
    }
}
