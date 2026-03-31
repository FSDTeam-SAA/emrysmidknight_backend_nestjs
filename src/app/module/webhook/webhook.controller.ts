import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler (PaymentIntent events)' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawPayload = req.rawBody
      ? req.rawBody
      : Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));

    return this.webhookService.handleWebhook(rawPayload, signature, res);
  }
}
