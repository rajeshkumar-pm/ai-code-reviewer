import OpenAI from "openai";
import type { Reviewer, ReviewInput, ReviewFinding } from "./types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseFindings } from "./parse.js";
import { logger } from "../utils/logger.js";

export class CodexReviewer implements Reviewer {
  readonly name = "Codex";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async review(input: ReviewInput): Promise<ReviewFinding[]> {
    logger.info({ model: input.config.model }, "Codex review started");

    const response = await this.client.chat.completions.create({
      model: input.config.model,
      max_tokens: input.config.maxTokens,
      messages: [
        { role: "system", content: buildSystemPrompt(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";

    logger.info(
      {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      },
      "Codex review completed"
    );

    return parseFindings(text, this.name);
  }
}
