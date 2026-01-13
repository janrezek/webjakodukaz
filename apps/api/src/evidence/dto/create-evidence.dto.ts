import { IsUrl } from 'class-validator';

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
}
