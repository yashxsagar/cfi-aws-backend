import { Test, TestingModule } from '@nestjs/testing';
import { GeneratecfiService } from './generatecfi.service';

describe('GeneratecfiService', () => {
  let service: GeneratecfiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneratecfiService],
    }).compile();

    service = module.get<GeneratecfiService>(GeneratecfiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
