import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { JoiValidationSchema } from './config/joi-validation.schema';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisModule } from './modules/redis/redis.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { OtpModule } from './modules/otp/otp.module';
import { MatchmakingModule } from './modules/matchmaking/matchmaking.module';
import { ChatModule } from './modules/chat/chat.module';
import { databaseConfig } from './config/database/database.config';
import { redisConfig } from './config/redis/redis.config';
import { winstonConfig } from './config/logger/wiston.config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/exception.filter';
import { ValidationPipe422 } from './common/pipe/validation.pipe';
import { TransformerInterceptor } from './common/interceptor/transformer.interceptor';
import { jwtConfig } from './config/jwt.config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// 01
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NDc3NjBkNy03YzY1LTQ5OWMtOGU4NS01ZjAxZmJmM2E4MDYiLCJlbWFpbCI6Im9iYWRleWkwMUBnbWFpbC5jb20iLCJwaG9uZU51bWJlciI6IisyMzQ4MTAxMjI5MTMxIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTQ2ODIyMjAsImV4cCI6MTc1NDc2ODYyMH0.9Yytj7OvhhrENmkr09Gm4bhCLmmAV9SRMkkSP6AdV2I
// 04
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYWMxNzQyNS0wNTkxLTRjM2ItYWE4OC00ZjAxMTk3MzlkODYiLCJlbWFpbCI6Im9iYWRleWkwNEBnbWFpbC5jb20iLCJwaG9uZU51bWJlciI6IisyMzQ4MTAwMjI4MzE0Iiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTQ2ODI0NjUsImV4cCI6MTc1NDc2ODg2NX0.UUWdfqiGBRGr3ZKsiKdgJn0yFUBkEMHzujbi0qv7ecw
@Module({
  imports: [
    // Configuration
        ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: JoiValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      load: [databaseConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
        extra: {
          connectionLimit: 20,
          acquireTimeout: 60000,
          timeout: 60000,
        },
      }),
      inject: [ConfigService],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      inject: [ConfigService],
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        try {
          const store = await redisStore({
            socket: {
              host: configService.get('redis.host'),
              port: configService.get('redis.port'),
              tls: configService.get('redis.tls'),
              rejectUnauthorized: false,
              reconnectStrategy: (retries: number) => {
                console.log(`Redis reconnection attempt ${retries}`);
                if (retries > 10) {
                  console.log('Redis max reconnection attempts reached');
                  return false; 
                }
                return Math.min(retries * 100, 3000); 
              },
              connectTimeout: 10000,
            },
            password: configService.get('redis.password'),
          });

          // Handle Redis client errors to prevent crashes
          if (store && (store as any).client) {
            (store as any).client.on('error', (error: Error) => {
              console.error('Redis Client Error:', error.message);
            });

            (store as any).client.on('connect', () => {
              console.log('Redis Cache connected successfully');
            });

            (store as any).client.on('disconnect', () => {
              console.log('Redis Cache disconnected');
            });

            (store as any).client.on('reconnecting', () => {
              console.log('Redis Cache reconnecting...');
            });
          }

          return {
            store,
            ttl: 300,
          };
        } catch (error) {
          console.error('Failed to initialize Redis cache:', error.message);
          return {
            store: 'memory',
            ttl: 300,
          };
        }
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: jwtConfig,
      inject: [ConfigService],
      global: true,
    }),
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: 60,
            limit: parseInt(configService.get<string>('RATE_LIMIT', '100'), 10),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    // Logging
    WinstonModule.forRootAsync(winstonConfig),
    // Feature modules
    HealthModule,
    UploadModule,
    UserModule,
    GeocodingModule,
    RedisModule,
    OtpModule,
    AuthModule,
    MatchmakingModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe422,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformerInterceptor,
    },
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
