import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async handleWebhook(@Body() body: any) {
    this.logger.log('Received webhook data');
    await this.webhookService.processWebhook(body);
  }
}
