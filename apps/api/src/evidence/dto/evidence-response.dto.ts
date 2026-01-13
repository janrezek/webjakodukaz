/**
 * Hash information for evidence integrity verification.
 */
export interface EvidenceHashDto {
  /** SHA-256 hash of the screenshot file */
  screenshot: string;
  /** SHA-256 hash of the complete evidence (combining all evidence data) */
  evidence: string;
}

/**
 * Artifact information with download URL.
 */
export interface EvidenceArtifactDto {
  /** Type of artifact (currently only SCREENSHOT_FULL) */
  type: 'SCREENSHOT_FULL';
  /** S3 object key (path) */
  key: string;
  /** Pre-signed URL for downloading the artifact */
  downloadUrl: string;
  /** Expiration time of the download URL in seconds */
  expiresInSeconds: number;
}

/**
 * Response DTO for evidence capture operation.
 * Contains all metadata, integrity hashes, and download information.
 */
export interface EvidenceResponseDto {
  /** Unique evidence identifier (format: ev_<uuid>) */
  evidenceId: string;
  /** Status of the evidence capture (currently always 'DONE') */
  status: 'DONE';
  /** URL that was captured */
  url: string;
  /** Timestamp when the evidence was captured (Unix timestamp in milliseconds) */
  timestamp: number;
  /** Integrity hashes for verification */
  hash: EvidenceHashDto;
  /** Artifact information with download URL */
  artifact: EvidenceArtifactDto;
}
