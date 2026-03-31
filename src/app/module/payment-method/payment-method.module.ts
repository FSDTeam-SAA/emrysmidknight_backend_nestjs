import { Module } from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { PaymentMethodController } from './payment-method.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PaymentMethod,
  PaymentMethodSchema,
} from './entities/payment-method.entity';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentMethodController],
  providers: [PaymentMethodService],
})
export class PaymentMethodModule {}
