import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  validateAspectRatio,
  getValidAspectRatios,
  generateImage,
} from "../src/gemini.js";

describe("validateAspectRatio", () => {
  it("accepts valid aspect ratios", () => {
    for (const ratio of getValidAspectRatios()) {
      expect(validateAspectRatio(ratio)).toBe(true);
    }
  });

  it("rejects invalid aspect ratios", () => {
    expect(validateAspectRatio("5:3")).toBe(false);
    expect(validateAspectRatio("")).toBe(false);
    expect(validateAspectRatio("abc")).toBe(false);
  });
});

describe("generateImage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nano-banana-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws on invalid aspect ratio", async () => {
    const fakeClient = {} as any;
    await expect(
      generateImage(fakeClient, {
        prompt: "test",
        aspectRatio: "99:1",
        outputDir: tmpDir,
      })
    ).rejects.toThrow("Invalid aspect ratio");
  });

  it("throws when API returns no candidates", async () => {
    const fakeClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ candidates: [] }),
      },
    } as any;

    await expect(
      generateImage(fakeClient, { prompt: "test", outputDir: tmpDir })
    ).rejects.toThrow("No response from Gemini API");
  });

  it("throws when API returns no image data", async () => {
    const fakeClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Sorry, I cannot generate that image." }],
              },
            },
          ],
        }),
      },
    } as any;

    await expect(
      generateImage(fakeClient, { prompt: "test", outputDir: tmpDir })
    ).rejects.toThrow("No image was generated");
  });

  it("saves image to disk and returns file path", async () => {
    const fakeImageBase64 = Buffer.from("fake-png-data").toString("base64");

    const fakeClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Here is your image" },
                  {
                    inlineData: {
                      data: fakeImageBase64,
                      mimeType: "image/png",
                    },
                  },
                ],
              },
            },
          ],
        }),
      },
    } as any;

    const result = await generateImage(fakeClient, {
      prompt: "a cute cat",
      outputDir: tmpDir,
      filename: "test-output.png",
    });

    expect(result.filePath).toBe(path.join(tmpDir, "test-output.png"));
    expect(result.mimeType).toBe("image/png");
    expect(result.text).toBe("Here is your image");
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(fs.readFileSync(result.filePath).toString()).toBe("fake-png-data");
  });

  it("passes correct config to Gemini API", async () => {
    const fakeImageBase64 = Buffer.from("data").toString("base64");
    const mockGenerate = vi.fn().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: fakeImageBase64, mimeType: "image/png" } },
            ],
          },
        },
      ],
    });

    const fakeClient = { models: { generateContent: mockGenerate } } as any;

    await generateImage(fakeClient, {
      prompt: "a sunset",
      aspectRatio: "16:9",
      outputDir: tmpDir,
      filename: "sunset.png",
    });

    expect(mockGenerate).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-preview-image-generation",
      contents: "a sunset",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });
  });
});
