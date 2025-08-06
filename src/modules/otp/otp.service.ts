import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Otp, OtpType } from './entities/otp.entity';
import twilio, { Twilio } from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private twilioClient?: Twilio;
  private readonly messagingServiceSid?: string;

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private configService: ConfigService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.messagingServiceSid = this.configService.get<string>(
      'TWILIO_MESSAGING_SERVICE_SID',
    );

    if (!accountSid || !authToken) {
      this.logger.warn(
        'Twilio ACCOUNT_SID or AUTH_TOKEN is missing. SMS sending will fallback to logging.',
      );
    } else {
      this.twilioClient = twilio(accountSid, authToken);
    }

    if (!this.messagingServiceSid) {
      this.logger.warn(
        'TWILIO_MESSAGING_SERVICE_SID not set. Falling back to using a from number (requires TWILIO_FROM_NUMBER).',
      );
    }
  }

  async sendOtp(phoneNumber: string, type: OtpType): Promise<void> {
    // Generate 6-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Set expiration time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Invalidate any existing OTPs for this phone number and type
    await this.otpRepository.update(
      { phoneNumber, type, isUsed: false },
      { isUsed: true },
    );

    // Create new OTP
    const otp = this.otpRepository.create({
      phoneNumber,
      code,
      type,
      expiresAt,
    });

    await this.otpRepository.save(otp);

    // Send SMS
    await this.sendSms(phoneNumber, code, type);
  }

  async verifyOtp(
    phoneNumber: string,
    code: string,
    type: OtpType,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        code,
        type,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      return false;
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    return true;
  }

  async isPhoneVerified(phoneNumber: string, type: OtpType): Promise<boolean> {
    const usedOtp = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        type,
        isUsed: true,
      },
      order: { createdAt: 'DESC' },
    });

    return !!usedOtp;
  }

  private async sendSms(
    phoneNumber: string,
    code: string,
    type: OtpType,
  ): Promise<void> {
    const message = this.getOtpMessage(code, type);

    if (!this.twilioClient) {
      // Development fallback
      this.logger.log(
        `OTP for ${phoneNumber}: ${code} (no Twilio client configured)`,
      );
      return;
    }

    const params: MessageInstance = {
      body: message,
      to: phoneNumber,
    } as any; // we'll add conditional fields below

    if (this.messagingServiceSid) {
      // Preferred: use Messaging Service SID
      (params as any).messagingServiceSid = this.messagingServiceSid;
    } else {
      // Fallback: explicit from number
      const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');
      if (!fromNumber) {
        this.logger.error(
          'Neither messaging service SID nor FROM number is configured. Cannot send SMS.',
        );
        throw new BadRequestException('SMS provider not properly configured');
      }
      params.from = fromNumber;
    }

    try {
      const resp = await this.twilioClient.messages.create(params);
      this.logger.debug(
        `Sent OTP to ${phoneNumber}. SID=${resp.sid} status=${resp.status} error=${resp.errorMessage}`,
      );
    } catch (error: any) {
      this.logger.error('Failed to send SMS via Twilio', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        raw: error,
      });
      throw new BadRequestException('Failed to send OTP');
    }
  }

  private getOtpMessage(code: string, type: OtpType): string {
    const appName = 'Dating App';

    switch (type) {
      case OtpType.REGISTRATION:
        return `Thanks for joining ${appName}! Your verification code is ${code}. It’s valid for 5 minutes—let’s get you started.`;
      case OtpType.ACCOUNT_VERIFICATION:
        return `Welcome to ${appName}! Your phone number is verified. Start exploring and meet people you’ll like.`;
      case OtpType.PASSWORD_RESET:
        return `Need to reset your password on ${appName}? Use code ${code} to continue. This code is valid for 5 minutes.`;
      default:
        return `Your ${appName} verification code is ${code}. It’s valid for 5 minutes.`;
    }
  }

  // Clean up expired OTPs (run this periodically)
  async cleanupExpiredOtps(phoneNumber: string, type: OtpType): Promise<void> {
    await this.otpRepository.delete({
      phoneNumber,
      type,
      isUsed: true,
      expiresAt: LessThan(new Date()), // extra safety, though already used
    });
  }
}
