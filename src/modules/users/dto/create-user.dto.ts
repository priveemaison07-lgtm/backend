import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ example: 'securePassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
