import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';

@ApiTags('Payment Method')
@Controller('payment-method')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  async createPaymentMethod(
    @Req() req: Request,
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodService.createPaymentMethod(
      req.user!.id,
      createPaymentMethodDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'paymentMethodId',
    required: false,
    description: 'Payment method ID',
  })
  @ApiQuery({
    name: 'cardBrand',
    required: false,
    description: 'Card brand',
  })
  @ApiQuery({
    name: 'cardLast4',
    required: false,
    description: 'Card last 4 digits',
  })
  @ApiQuery({
    name: 'expiryMonth',
    required: false,
    description: 'Expiry month',
  })
  @ApiQuery({
    name: 'expiryYear',
    required: false,
    description: 'Expiry year',
  })
  @ApiQuery({
    name: 'cardHolderName',
    required: false,
    description: 'Card holder name',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  async findAllPaymentMethods(@Req() req: Request) {
    const filetrs = pick(req.query, [
      'searchTerm',
      'paymentMethodId',
      'cardBrand',
      'cardLast4',
      'expiryMonth',
      'expiryYear',
      'cardHolderName',
    ]);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'sortOrder']);
    return this.paymentMethodService.findAllPaymentMethods(
      req.user!.id,
      filetrs,
      options,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment method' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  async findOnePaymentMethod(@Req() req: Request, @Param('id') id: string) {
    const result = await this.paymentMethodService.findOnePaymentMethod(
      req.user!.id,
      id,
    );
    return {
      message: 'Payment method fetched successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  async removePaymentMethod(@Req() req: Request, @Param('id') id: string) {
    const result = await this.paymentMethodService.removePaymentMethod(
      req.user!.id,
      id,
    );
    return {
      message: 'Payment method deleted successfully',
      data: result,
    };
  }
}
