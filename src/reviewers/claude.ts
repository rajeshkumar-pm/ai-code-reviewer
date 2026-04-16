import Anthropic from "@anthropic-ai/sdk";
import type { Reviewer, ReviewInput, ReviewFinding } from "./types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseFindings } from "./parse.js";
import { logger } from "../utils/logger.js";

export class ClaudeReviewer implements Reviewer {
  readonly name = "Claude";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async review(input: ReviewInput): Promise<ReviewFinding[]> {
    const text = await this.call(input);
    return parseFindings(text, input.config.name);
  }

  async analyze(input: ReviewInput): Promise<string> {
    return this.call(input);
  }

  private async call(input: ReviewInput): Promise<string> {
    logger.info(
      { model: input.config.model, pass: input.config.name },
      "Claude call started"
    );

    const response = await this.client.messages.create({
      model: input.config.model,
      max_tokens: input.config.maxTokens,
      system: buildSystemPrompt(input),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    logger.info(
      {
        pass: input.config.name,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      "Claude call completed"
    );

    return text;
  }
}
