import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  Length,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The OTP received', example: '123456' })
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits long' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({ description: 'User password', example: 'StrongPassword123!' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  newPassword: string;
}
