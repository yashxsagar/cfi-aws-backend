import { Module } from '@nestjs/common';
import { NotionService } from './notion.service';
import { NotionController } from './notion.controller';
import { GenerateCfiService } from 'src/generatecfi/generatecfi.service';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from '@nestjs/config';
import { VercelBlobService } from 'src/vercel-blob/vercel-blob.service';

@Module({
  controllers: [NotionController],
  providers: [
    NotionService,
    GenerateCfiService,
    DatabaseService,
    ConfigService,
    VercelBlobService,
  ],
})
export class NotionModule {}
