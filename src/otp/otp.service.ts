import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Otp, OtpType } from './entities/otp.entity';
import twilio from 'twilio';

@Injectable()
export class OtpService {
  private twilioClient: twilio.Twilio;

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private configService: ConfigService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  async sendOtp(phoneNumber: string, type: OtpType): Promise<void> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

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

    if (new Date() > otp.expiresAt) {
      return false;
    }

    // Mark OTP as used
    otp.isUsed = true;
    otp.verified = true; // Mark as verified
    await this.otpRepository.save(otp);

    return true;
  }

  async isPhoneVerified(phoneNumber: string, type: OtpType): Promise<boolean> {
    const verifiedOtp = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        type,
        isUsed: true,
      },
      order: { createdAt: 'DESC' },
    });

    return !!verifiedOtp;
  }

  private async sendSms(
    phoneNumber: string,
    code: string,
    type: OtpType,
  ): Promise<void> {
    const message = this.getOtpMessage(code, type);

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: this.configService.get('TWILIO_PHONE_NUMBER'),
          to: phoneNumber,
        });
      } catch (error) {
        console.error('Failed to send SMS:', error);
        throw new BadRequestException('Failed to send OTP');
      }
    } else {
      // For development, log the OTP
      console.log(`OTP for ${phoneNumber}: ${code}`);
    }
  }

  private getOtpMessage(code: string, type: OtpType): string {
    const appName = 'Dating App';

    switch (type) {
      case OtpType.REGISTRATION:
        return `Welcome to ${appName}! Your verification code is: ${code}. Valid for 5 minutes.`;
      case OtpType.LOGIN:
        return `Your ${appName} login code is: ${code}. Valid for 5 minutes.`;
      case OtpType.PASSWORD_RESET:
        return `Your ${appName} password reset code is: ${code}. Valid for 5 minutes.`;
      default:
        return `Your ${appName} verification code is: ${code}. Valid for 5 minutes.`;
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
