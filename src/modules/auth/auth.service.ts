import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { AuthProvider } from '../../modules/users/enums/auth-provider.enum';
import { UserPreference } from '../../modules/users/entities/user-preference.entity';
import { OtpService } from '../otp/otp.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { SendOtpDto } from './dto/sendOtp.dto';
import { LoginUserDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password';
import { RegisterUserDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify.dto';
import { OtpType } from '../otp/entities/otp.entity';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private redisService: RedisService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  // async sendOtp(sendOtpDto: SendOtpDto) {
  //   const { phoneNumber } = sendOtpDto;

  //   // Check if user already exists
  //   const existingUser = await this.userRepository.findOne({
  //     where: { phoneNumber },
  //   });

  //   if (existingUser) {
  //     throw new ConflictException('User already exists with this phone number');
  //   }

  //   // Send OTP
  //   await this.otpService.sendOtp(phoneNumber, OtpType.REGISTRATION);

  //   return {
  //     message: 'OTP sent successfully',
  //     phoneNumber,
  //   };
  // }

  async register(registerUserDto: RegisterUserDto) {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phoneNumber,
    } = registerUserDto;

    // Password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    // Check if phone number was verified
    const isPhoneVerified = await this.otpService.isPhoneVerified(
      phoneNumber,
      OtpType.REGISTRATION,
    );

    if (isPhoneVerified) {
      throw new BadRequestException('Phone number is verified, try to login');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email: email.toLowerCase() }, { phoneNumber: phoneNumber }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('User with this email already exists.');
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new BadRequestException(
          'User with this phone number already exists.',
        );
      }
    }

    // Hash the password
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(password, salt);

    return await this.userRepository.manager.transaction(async (manager) => {
      const user = manager.create(User, {
        firstName: firstName.toLowerCase(),
        lastName: lastName.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        authProvider: AuthProvider.PHONE,
        isVerified: false,
      });

      const savedUser = await manager.save(user);

      const preferences = manager.create(UserPreference, {
        userId: savedUser.id,
      });

      await manager.save(preferences);

      // Send OTP for registration verification
      await this.otpService.sendOtp(phoneNumber, OtpType.REGISTRATION);

      const accessToken = this.generateToken(savedUser);

      return {
        message:
          'Account created successfully. Please check your phone for verification code.',
        accessToken,
      };
    });
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phoneNumber, otp } = verifyOtpDto;

    const isValid = await this.otpService.verifyOtp(
      phoneNumber,
      otp,
      OtpType.REGISTRATION, // match what was sent
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findOneBy({ phoneNumber });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update({ id: user.id }, { isVerified: true });

    await this.otpService.cleanupExpiredOtps(phoneNumber, OtpType.REGISTRATION);

    return {
      message: 'OTP verified successfully',
      phoneNumber,
      canProceed: true,
    };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
      relations: ['preferences'],
    });
    if (!existingUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if phone number is verified
    if (!existingUser.isVerified) {
      throw new UnauthorizedException(
        'Phone number not verified. Please verify your phone number first.',
      );
    }

    const isPasswordValid = compareSync(password, existingUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['preferences'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update last seen in a transaction
    await this.userRepository.update({ id: user.id }, { lastSeen: new Date() });

    // Generate JWT token
    const accessToken = this.generateToken(user);

    // Cache user session
    await this.redisService.set(
      `user:${user.id}:token`,
      accessToken,
      7 * 24 * 60 * 60,
    ); // 7 days

    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (!user.phoneNumber || !user.isVerified) {
      throw new BadRequestException('Verified phone number required for reset');
    }

    // Send OTP to user's phoneNumber
    await this.otpService.sendOtp(user.phoneNumber, OtpType.PASSWORD_RESET);

    return { message: 'OTP sent successfully to your phone number' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phoneNumber) {
      throw new BadRequestException(
        'No phone number associated with this account',
      );
    }

    const isValidOtp = await this.otpService.verifyOtp(
      user.phoneNumber,
      otp,
      OtpType.PASSWORD_RESET,
    );

    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isSamePassword = compareSync(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must differ from old one');
    }

    const salt = genSaltSync(10);
    const hashedPassword = hashSync(newPassword, salt);

    user.password = hashedPassword;

    await this.userRepository.save(user);

    // Invalidate all existing sessions
    await this.redisService.del(`user:${user.id}:token`);

    await this.otpService.cleanupExpiredOtps(
      user.phoneNumber,
      OtpType.PASSWORD_RESET,
    );

    return { message: 'Password reset successful' };
  }

  async logout(userId: string) {
    await this.redisService.del(`user:${userId}:token`);
    return { message: 'Logged out successfully' };
  }

  // Google Mobile Auth
  async googleMobileAuth(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token: payload is undefined');
    }
    const { sub, email, given_name, family_name } = payload;

    let user = await this.userRepository.findOne({
      where: { googleId: sub },
      relations: ['preferences'],
    });

    if (!user) {
      user = this.userRepository.create({
        googleId: sub,
        email,
        firstName: given_name,
        lastName: family_name,
        authProvider: AuthProvider.GOOGLE,
        isVerified: true,
        phoneNumber: '',
      });

      user = await this.userRepository.save(user);
    }

    user.lastSeen = new Date();
    await this.userRepository.save(user);

    const accessToken = this.generateToken(user);

    return {
      message: 'Google login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    };
  }

  // Apple Mobile Auth
  async appleMobileAuth(idToken: string) {
    let appleUser: any;

    try {
      appleUser = await appleSignin.verifyIdToken(idToken, {
        teamId: this.configService.get<string>('APPLE_TEAM_ID')!,
        audience: this.configService.get<string>('APPLE_CLIENT_ID')!,
        ignoreExpiration: false,
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid Apple ID token');
    }

    const { sub, email } = appleUser;

    let user = await this.userRepository.findOne({
      where: { appleId: sub },
      relations: ['preferences'],
    });

    if (!user) {
      user = this.userRepository.create({
        appleId: sub,
        email,
        firstName: 'User',
        lastName: '',
        authProvider: AuthProvider.APPLE,
        isVerified: true,
        phoneNumber: '',
      });

      user = await this.userRepository.save(user);
    }

    user.lastSeen = new Date();
    await this.userRepository.save(user);

    const accessToken = this.generateToken(user);

    return {
      message: 'Apple login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    };
  }
  // async validateUser(userId: string): Promise<User> {
  //   const user = await this.userRepository.findOne({
  //     where: { id: userId, isActive: true },
  //     relations: ['preferences'],
  //   });

  //   if (!user) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   return user;
  // }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
