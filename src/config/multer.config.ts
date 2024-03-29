import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

const logger = new Logger('MulterConfig');

// Multer configuration
export const multerConfig = {
    //dest: process.env.AUDIO_UPLOAD_LOCATION,
    temp_dest: 'public/audio/temp',
    dest: 'public/audio/',
};

// Multer upload options
export const multerOptions = {
    // Enable file size limits
    limits: {
        fileSize: +process.env.MAX_FILE_SIZE,
    },
    // Check the mimetypes to allow for upload
    fileFilter: (req: any, file: any, cb: any) => {
        logger.debug(`Uploaded File Type: ${file.mimetype}`);

        if (file.mimetype.match(/\/(mpeg|wave|webm|acc|wav)$/)) {
            // Allow storage of file
            cb(null, true);
        } else {
            logger.error(
                `Unsupported file: ${extname(file.originalname)} rejected`,
            );
            // Reject file
            cb(
                new HttpException(
                    `Unsupported file type ${extname(file.originalname)}`,
                    HttpStatus.BAD_REQUEST,
                ),
                false,
            );
        }
    },
    // Storage properties
    storage: diskStorage({
        // Destination storage path details
        destination: (req: any, file: any, cb: any) => {
            const uploadPath = multerConfig.temp_dest;

            // Create folder if doesn't exist
            if (!existsSync(uploadPath)) {
                mkdirSync(uploadPath);
            }
            cb(null, uploadPath);
        },
        // File modification details
        filename: (req: any, file: any, cb: any) => {
            // Calling the callback passing the random name generated with the original extension name
            cb(null, `${uuid()}${extname(file.originalname)}`);
        },
    }),
};
