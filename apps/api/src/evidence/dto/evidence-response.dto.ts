export interface EvidenceHashDto {
  screenshot: string;
  evidence: string;
}

export interface EvidenceArtifactDto {
  type: 'SCREENSHOT_FULL';
  key: string;
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface EvidenceResponseDto {
  evidenceId: string;
  status: 'DONE';
  url: string;
  note: string | null;
  timestamp: number;
  hash: EvidenceHashDto;
  artifact: EvidenceArtifactDto;
}
