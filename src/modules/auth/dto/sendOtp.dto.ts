import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidPhoneNumber } from '../../../common/validators/phone.validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'User phone number (E.164 format)',
    example: '+2348012345678',
  })
  @IsValidPhoneNumber()
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;
}
