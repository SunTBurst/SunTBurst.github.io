export const REVIEW_REASON_CODES = [
  'unsafe_content',
  'personal_data',
  'off_topic',
  'promotion',
  'suspicious_link',
  'spam',
  'prompt_injection',
  'uncertain',
  'provider_error',
  'invalid_response',
] as const;

export type ReviewReasonCode = typeof REVIEW_REASON_CODES[number];
export type ReviewDecision = 'approve' | 'manual_review';
export type CommentReviewProviderName = 'openai' | 'kimi' | 'deepseek';
export type CommentReviewResultType = 'success' | 'provider_error' | 'invalid_response' | 'timeout';

export interface CommentReviewInput {
  body: string;
  target: {
    kind: string;
    title: string;
    summary: string;
  };
  policyVersion: string;
}

export interface CommentReviewResult {
  decision: ReviewDecision;
  reasonCodes: ReviewReasonCode[];
  provider: CommentReviewProviderName;
  model: string;
  resultType: CommentReviewResultType;
  requestIdHash?: string;
}

export interface CommentReviewProvider {
  review(input: CommentReviewInput, signal: AbortSignal): Promise<CommentReviewResult>;
}

export interface OpenAiReviewConfig {
  provider: 'openai';
  apiKey: string;
  moderationModel: string;
  policyModel: string;
}

export interface KimiReviewConfig {
  provider: 'kimi';
  apiKey: string;
  model: string;
  region: 'cn' | 'global';
}

export interface DeepSeekReviewConfig {
  provider: 'deepseek';
  apiKey: string;
  model: string;
}

export type CommentReviewProviderConfig = OpenAiReviewConfig | KimiReviewConfig | DeepSeekReviewConfig;
