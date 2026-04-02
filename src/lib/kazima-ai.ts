import Anthropic from "@anthropic-ai/sdk";
import {
  KAZIMA_SYSTEM_PROMPT,
  KazimaMode,
  buildPrompt,
} from "./kazima-prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface KazimaAIRequest {
  mode: KazimaMode;
  text: string;
  context?: string;
  previousResponse?: string;
}

export interface KazimaAIResponse {
  mode: KazimaMode;
  result: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  timestamp: string;
}

const VALID_MODES: KazimaMode[] = [
  "analysis",
  "extraction",
  "footnotes",
  "publication",
  "media",
  "review",
  "comparison",
  "error_detection",
  "manuscript_expert",
];

export function validateMode(mode: string): mode is KazimaMode {
  return VALID_MODES.includes(mode as KazimaMode);
}

export async function processKazimaAI(
  request: KazimaAIRequest
): Promise<KazimaAIResponse> {
  const { mode, text, context, previousResponse } = request;

  // Build the user prompt with mode-specific instructions
  let userPrompt = buildPrompt(mode, text, context);

  // For review mode, include previous response
  if (mode === "review" && previousResponse) {
    userPrompt =
      `الإجابة السابقة التي يجب مراجعتها:\n${previousResponse}\n\n` +
      userPrompt;
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: KAZIMA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const resultText =
    message.content[0].type === "text" ? message.content[0].text : "";

  return {
    mode,
    result: resultText,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    timestamp: new Date().toISOString(),
  };
}
