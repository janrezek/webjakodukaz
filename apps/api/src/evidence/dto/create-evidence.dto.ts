import { IsUrl, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Data transfer object for creating new evidence.
 * Used for validating input when capturing web pages.
 */
export class CreateEvidenceDto {
  /**
   * URL of the web page to capture as evidence.
   * Must be a valid URL with protocol (http:// or https://).
   */
  @IsUrl({ require_protocol: true })
  url!: string;

  /**
   * Optional note or description for the evidence.
   * Maximum length: 500 characters.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
