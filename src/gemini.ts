import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  outputDir?: string;
  filename?: string;
}

export interface GenerateImageResult {
  filePath: string;
  mimeType: string;
  text?: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash-preview-image-generation";
const VALID_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];

export function getClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export function validateAspectRatio(ratio: string): boolean {
  return VALID_ASPECT_RATIOS.includes(ratio);
}

export function getValidAspectRatios(): string[] {
  return [...VALID_ASPECT_RATIOS];
}

export async function generateImage(
  client: GoogleGenAI,
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const model = options.model || DEFAULT_MODEL;
  const aspectRatio = options.aspectRatio || "1:1";
  const outputDir = options.outputDir || process.cwd();
  const timestamp = Date.now();
  const filename = options.filename || `nano-banana-${timestamp}.png`;

  if (!validateAspectRatio(aspectRatio)) {
    throw new Error(
      `Invalid aspect ratio "${aspectRatio}". Valid options: ${VALID_ASPECT_RATIOS.join(", ")}`
    );
  }

  const response = await client.models.generateContent({
    model,
    contents: options.prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio as any,
      },
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No response from Gemini API");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error("No content parts in response");
  }

  let resultText: string | undefined;
  let imageData: { data: string; mimeType: string } | undefined;

  for (const part of parts) {
    if (part.text) {
      resultText = part.text;
    }
    if (part.inlineData) {
      imageData = {
        data: part.inlineData.data!,
        mimeType: part.inlineData.mimeType!,
      };
    }
  }

  if (!imageData) {
    throw new Error(
      "No image was generated. The model returned only text" +
        (resultText ? `: "${resultText}"` : ".")
    );
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  const buffer = Buffer.from(imageData.data, "base64");
  fs.writeFileSync(filePath, buffer);

  return {
    filePath,
    mimeType: imageData.mimeType,
    text: resultText,
  };
}
