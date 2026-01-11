import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceController } from './evidence.controller';

describe('EvidenceController', () => {
  let controller: EvidenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceController],
    }).compile();

    controller = module.get<EvidenceController>(EvidenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
