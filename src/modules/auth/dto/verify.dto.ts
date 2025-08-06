import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidPhoneNumber } from '../../../common/validators/phone.validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User phone number (E.164 format)',
    example: '+2348012345678',
  })
  @IsValidPhoneNumber()
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @ApiProperty({ description: 'The OTP received', example: '123456' })
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits long' }) // Assuming 6-digit OTP
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}
