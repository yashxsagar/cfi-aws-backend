import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GenerateCfiService } from './generatecfi.service';
import { CreateGeneratecfiDto } from './dto/create-generatecfi.dto';
import { UpdateGeneratecfiDto } from './dto/update-generatecfi.dto';

@Controller('generatecfi')
export class GeneratecfiController {
  constructor(private readonly generatecfiService: GenerateCfiService) {}
  @Post()
  async getFairnessIndicator(
    @Body() createGeneratecfiDto: CreateGeneratecfiDto,
  ): Promise<{ fairnessIndicator: { signal: string; assessment: string } }> {
    const { jobTitle, location, state, compensationOffered } =
      createGeneratecfiDto;
    const fairnessIndicator =
      await this.generatecfiService.getFairnessIndicator(
        jobTitle,
        location,
        state,
        compensationOffered,
      );
    return { fairnessIndicator };
  }
}
