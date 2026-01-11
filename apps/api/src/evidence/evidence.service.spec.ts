import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EvidenceService } from './evidence.service';
import { S3Service } from '../storage/s3.service';
import { HashService } from '../common/hash.service';

describe('EvidenceService', () => {
  let service: EvidenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                S3_RAW_PREFIX: 'raw',
              };
              return config[key];
            }),
          },
        },
        {
          provide: S3Service,
          useValue: {
            upload: jest.fn(),
            getPresignedUrl: jest.fn(),
          },
        },
        {
          provide: HashService,
          useValue: {
            createHash: jest.fn(),
            createEvidenceHash: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
