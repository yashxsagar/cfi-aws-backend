import {
  IsString,
  IsNumber,
  Min,
  Max,
  Length,
  Matches,
  IsNotEmpty,
} from 'class-validator';
export class CreateGeneratecfiDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  jobTitle: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  location: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  state: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(20000)
  @Max(5000000)
  compensationOffered: number;
}
