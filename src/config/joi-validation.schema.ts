import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),

<<<<<<< HEAD
  // Twilio (optional for development)
  TWILIO_ACCOUNT_SID: Joi.string().optional().allow(''),
  TWILIO_AUTH_TOKEN: Joi.string().optional().allow(''),
  TWILIO_MESSAGING_SERVICE_SID: Joi.string().optional().allow(''),
  TWILIO_FROM_NUMBER: Joi.string().optional().allow(''),
=======
  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_MESSAGING_SERVICE_SID: Joi.string().required(),
  TWILIO_FROM_NUMBER: Joi.string().required(),
>>>>>>> ec0e7cd626026137744d57bf1965c0c76a408bd3

  // Google
  // GOOGLE_CLIENT_ID: Joi.string().required(),
  // GOOGLE_CLIENT_SECRET: Joi.string().required(),

  // Apple
  // APPLE_CLIENT_ID: Joi.string().required(),
  // APPLE_TEAM_ID: Joi.string().required(),

  // Cloudinary
  // CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  // CLOUDINARY_API_KEY: Joi.string().required(),
  // CLOUDINARY_API_SECRET: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_TLS: Joi.boolean().default(true),
  REDIS_URL: Joi.string().uri().default('rediss://localhost:6379'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // OTP
  OTP_EXPIRY_MINUTES: Joi.number().default(10),
  OTP_LENGTH: Joi.number().default(6),

<<<<<<< HEAD
  // Google Map (optional for development)
  GOOGLE_MAPS_API_KEY: Joi.string().optional().allow(''),
=======
  // Google Map
  GOOGLE_MAPS_API_KEY: Joi.string().required(),
>>>>>>> ec0e7cd626026137744d57bf1965c0c76a408bd3
});
