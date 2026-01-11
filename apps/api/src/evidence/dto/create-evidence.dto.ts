import { IsUrl, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEvidenceDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
