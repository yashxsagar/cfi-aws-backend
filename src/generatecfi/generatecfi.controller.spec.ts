import { Test, TestingModule } from '@nestjs/testing';
import { GeneratecfiController } from './generatecfi.controller';
import { GeneratecfiService } from './generatecfi.service';

describe('GeneratecfiController', () => {
  let controller: GeneratecfiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneratecfiController],
      providers: [GeneratecfiService],
    }).compile();

    controller = module.get<GeneratecfiController>(GeneratecfiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
