#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getClient,
  generateImage,
  getValidAspectRatios,
  getModelIds,
  IMAGE_MODELS,
  DEFAULT_MODEL,
} from "./gemini.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error(
    "Error: GEMINI_API_KEY environment variable is required.\n" +
      "Set it with: export GEMINI_API_KEY=your_key_here"
  );
  process.exit(1);
}

const OUTPUT_DIR =
  process.env.NANO_BANANA_OUTPUT_DIR ||
  `${process.env.HOME}/Pictures/nano-banana`;

let currentModel = process.env.NANO_BANANA_MODEL || DEFAULT_MODEL;

const client = getClient(GEMINI_API_KEY);

const server = new McpServer({
  name: "nano-banana",
  version: "1.1.0",
});

const modelIds = getModelIds();

server.tool(
  "generate_image",
  `Generate an image using Nano Banana (Gemini). Saves the image to disk and returns the file path. Use this tool whenever the user asks to generate, create, draw, or make an image, picture, illustration, photo, artwork, or visual.`,
  {
    prompt: z
      .string()
      .describe(
        "Detailed description of the image to generate. Be specific about style, content, colors, composition."
      ),
    aspect_ratio: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])
      .optional()
      .default("1:1")
      .describe("Aspect ratio for the generated image."),
    model: z
      .string()
      .optional()
      .describe(
        `Model to use for this generation. Available: ${modelIds.join(", ")}. Defaults to the current active model.`
      ),
    filename: z
      .string()
      .optional()
      .describe(
        "Optional filename for the output image (e.g. 'my-character.png'). Defaults to auto-generated name with timestamp."
      ),
  },
  async ({ prompt, aspect_ratio, model, filename }) => {
    try {
      const useModel = model || currentModel;
      const result = await generateImage(client, {
        prompt,
        model: useModel,
        aspectRatio: aspect_ratio,
        outputDir: OUTPUT_DIR,
        filename,
      });

      const lines = [
        `Image generated successfully!`,
        `File: ${result.filePath}`,
        `Type: ${result.mimeType}`,
        `Model: ${result.model}`,
      ];
      if (result.text) {
        lines.push(`Model notes: ${result.text}`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to generate image: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_models",
  "List all available image generation models for Nano Banana.",
  {},
  async () => {
    const lines = IMAGE_MODELS.map((m) => {
      const active = m.id === currentModel ? " (active)" : "";
      return `- **${m.name}**${active}\n  ID: \`${m.id}\`\n  ${m.description}`;
    });

    return {
      content: [
        {
          type: "text",
          text: `Available models:\n\n${lines.join("\n\n")}`,
        },
      ],
    };
  }
);

server.tool(
  "set_model",
  "Change the active image generation model for Nano Banana.",
  {
    model: z
      .string()
      .describe(
        `Model ID to set as active. Available: ${modelIds.join(", ")}`
      ),
  },
  async ({ model }) => {
    const found = IMAGE_MODELS.find((m) => m.id === model);
    if (!found) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown model "${model}". Available: ${modelIds.join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    currentModel = model;
    return {
      content: [
        {
          type: "text",
          text: `Active model changed to: ${found.name} (${found.id})`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nano Banana MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
