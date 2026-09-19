export type ProviderCapability = 'LLM' | 'IMAGE' | 'VIDEO' | 'TTS' | 'AUDIO' | 'RENDER' | 'QC';

export interface ProviderRequest {
  provider: string;
  model: string;
  capability: ProviderCapability;
  input: Record<string, unknown>;
  parameters: Record<string, unknown>;
}

export interface ProviderResult {
  providerJobId: string;
  status: 'SUBMITTED' | 'SUCCEEDED' | 'FAILED';
  output?: Record<string, unknown>;
  usage?: { inputTokens?: number; outputTokens?: number; durationSeconds?: number };
  estimatedCost?: number;
}