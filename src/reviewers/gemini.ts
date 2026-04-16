import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Reviewer, ReviewInput, ReviewFinding } from "./types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseFindings } from "./parse.js";
import { logger } from "../utils/logger.js";

export class GeminiReviewer implements Reviewer {
  readonly name = "Gemini";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async review(input: ReviewInput): Promise<ReviewFinding[]> {
    logger.info({ model: input.config.model }, "Gemini review started");

    const model = this.genAI.getGenerativeModel({
      model: input.config.model,
      generationConfig: {
        maxOutputTokens: input.config.maxTokens,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const chat = model.startChat({
      systemInstruction: buildSystemPrompt(input),
    });

    const result = await chat.sendMessage(buildUserPrompt(input));
    const text = result.response.text();

    logger.info("Gemini review completed");

    return parseFindings(text, this.name);
  }
}
