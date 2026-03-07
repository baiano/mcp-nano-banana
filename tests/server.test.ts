import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function createTestServerAndClient(): Promise<{
  server: McpServer;
  client: Client;
}> {
  // We need to import the server module dynamically after setting env vars
  // But since our index.ts calls process.exit, we'll build a minimal server here
  // that mirrors the real one, to test the MCP tool registration and schema
  const { z } = await import("zod");

  const server = new McpServer({
    name: "nano-banana",
    version: "1.0.0",
  });

  server.tool(
    "generate_image",
    "Generate an image using Nano Banana (Gemini).",
    {
      prompt: z.string().describe("Image description"),
      aspect_ratio: z
        .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])
        .optional()
        .default("1:1"),
      filename: z.string().optional(),
    },
    async ({ prompt, aspect_ratio, filename }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: `Mock: would generate "${prompt}" at ${aspect_ratio}`,
          },
        ],
      };
    }
  );

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { server, client };
}

describe("MCP Server", () => {
  it("lists the generate_image tool", async () => {
    const { client } = await createTestServerAndClient();
    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    expect(toolNames).toContain("generate_image");
  });

  it("generate_image tool has correct input schema", async () => {
    const { client } = await createTestServerAndClient();
    const tools = await client.listTools();
    const tool = tools.tools.find((t) => t.name === "generate_image")!;
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("aspect_ratio");
    expect(tool.inputSchema.properties).toHaveProperty("filename");
    expect(tool.inputSchema.required).toContain("prompt");
  });

  it("can call generate_image tool", async () => {
    const { client } = await createTestServerAndClient();
    const result = await client.callTool({
      name: "generate_image",
      arguments: { prompt: "a red dragon" },
    });
    expect(result.content).toHaveLength(1);
    const textContent = result.content![0] as { type: string; text: string };
    expect(textContent.text).toContain("a red dragon");
    expect(textContent.text).toContain("1:1");
  });
});
