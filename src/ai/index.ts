import "server-only";

export {
  requestAiChatCompletion,
  type AiChatMessage,
} from "@/src/ai/client";
export {
  generateLetterResponseDraftWithAi,
  summarizeRelatedLetterTreeWithAi,
  type LetterResponseDraftResult,
  type LetterRelationSummaryResult,
} from "@/src/ai/features/letterRelationSummary";
