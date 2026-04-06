import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({
    example: 'visa',
    description: 'Card brand. Optional, backend can detect it automatically.',
    required: false,
  })
  @IsString()
  @IsOptional()
  cardBrand?: string;

  @ApiProperty({
    example: '4242424242424242',
    required: true,
    description: 'Card number',
  })
  @IsString()
  @Length(13, 19)
  cardNumber: string;

  @ApiProperty({
    example: '12/28',
    description: 'MM/YY format',
    required: true,
  })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: 'Expiry date must be in MM/YY format',
  })
  expiryDate: string;

  @ApiProperty({
    example: '123',
    required: true,
    description: '3 or 4 digit card security code',
  })
  @IsString()
  @Length(3, 4)
  cvc: string;

  @ApiProperty({
    example: 'John Doe',
    required: false,
    description: 'Card holder full name',
  })
  @IsString()
  @IsOptional()
  cardHolderName?: string;
}
