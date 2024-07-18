import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { GenerateCfiService } from 'src/generatecfi/generatecfi.service';
import { NotionService } from 'src/notion/notion.service';
import { DatabaseService } from 'src/database/database.service';
import { VercelBlobService } from 'src/vercel-blob/vercel-blob.service';

@Module({
  controllers: [WebhookController],
  providers: [
    WebhookService,
    GenerateCfiService,
    NotionService,
    DatabaseService,
    VercelBlobService,
  ],
})
export class WebhookModule {}
