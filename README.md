# MCP Nano Banana

MCP server for image generation using Nano Banana (Gemini). Use it with Claude Code to generate images directly from your prompts.

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Save it securely (you'll use it in step 3)

### 2. Build the server

```bash
git clone https://github.com/baiano/mcp-nano-banana.git
cd mcp-nano-banana
npm install
npm run build
```

### 3. Store the API key securely

Add the key to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export GEMINI_API_KEY=your_key_here' >> ~/.zshrc
source ~/.zshrc
```

Alternatively, you can set it per-project in the Claude Code MCP config (see below).

### 4. Add to Claude Code

Run the following command:

```bash
claude mcp add nano-banana -- node /absolute/path/to/mcp-nano-banana/dist/index.js
```

Or add it manually to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-nano-banana/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your_key_here"
      }
    }
  }
}
```

If you set `GEMINI_API_KEY` in your shell profile, you can omit the `env` block.

### 5. Optional: custom output directory

By default, images are saved to `~/Pictures/nano-banana/`. Override it with:

```json
{
  "env": {
    "GEMINI_API_KEY": "your_key_here",
    "NANO_BANANA_OUTPUT_DIR": "/path/to/your/folder"
  }
}
```

## Usage

Once configured, just ask Claude Code to generate images naturally:

- "Generate an image of a medieval knight in pixel art style"
- "Create a 16:9 landscape of a futuristic city at sunset"
- "Draw a cute cartoon cat with a wizard hat, save as wizard-cat.png"

Claude will recognize the intent and call the `generate_image` tool via MCP.

## Tool: `generate_image`

| Parameter | Required | Description |
|---|---|---|
| `prompt` | Yes | Detailed description of the image to generate |
| `aspect_ratio` | No | `1:1` (default), `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3` |
| `filename` | No | Custom filename (e.g. `my-image.png`). Auto-generated if omitted |

## Development

```bash
npm test        # Run tests
npm run build   # Compile TypeScript
```
