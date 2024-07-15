import { PartialType } from '@nestjs/mapped-types';
import { CreateGeneratecfiDto } from './create-generatecfi.dto';

export class UpdateGeneratecfiDto extends PartialType(CreateGeneratecfiDto) {}
