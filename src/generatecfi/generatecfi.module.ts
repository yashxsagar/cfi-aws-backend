import { Module } from '@nestjs/common';
import { GenerateCfiService } from './generatecfi.service';
import { GeneratecfiController } from './generatecfi.controller';
import { DatabaseService } from '../database/database.service';
import { VercelBlobService } from 'src/vercel-blob/vercel-blob.service';

@Module({
  controllers: [GeneratecfiController],
  providers: [GenerateCfiService, DatabaseService, VercelBlobService],
})
export class GeneratecfiModule {}
