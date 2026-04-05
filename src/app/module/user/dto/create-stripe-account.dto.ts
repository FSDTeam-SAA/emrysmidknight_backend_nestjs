import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateStripeAccountDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
