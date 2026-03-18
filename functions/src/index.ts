import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import OpenAI from "openai";
import { z } from "zod";
import * as https from "https";
import * as http from "http";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MCP_SECRET = defineSecret("MCP_SECRET");

const SUPPORTED_FORMATS = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];

// Schema extraido para evitar type instantiation excessivamente profunda
const transcribeSchema = {
  audio_url: z.string().optional(),
  audio_base64: z.string().optional(),
  filename: z.string().optional().default("audio.mp3"),
  language: z.string().optional().default("pt"),
};

/**
 * Faz download de uma URL e retorna um Buffer com o conteudo.
 */
function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Cria e configura o McpServer com a tool transcribe_audio.
 */
function buildMcpServer(openaiApiKey: string): McpServer {
  const server = new McpServer({
    name: "mcp-whisper",
    version: "1.0.0",
  });

  const client = new OpenAI({ apiKey: openaiApiKey });

  server.tool(
    "transcribe_audio",
    "Transcreve um arquivo de audio usando OpenAI Whisper (whisper-1). " +
      "Aceita URL publica ou conteudo em base64. " +
      "Formatos suportados: mp3, mp4, mpeg, mpga, m4a, wav, webm.",
    transcribeSchema,
    async ({ audio_url, audio_base64, filename, language }) => {
      if (!audio_url && !audio_base64) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Erro: forneça 'audio_url' ou 'audio_base64'.",
            },
          ],
          isError: true,
        };
      }

      let audioBuffer: Buffer;
      let resolvedFilename: string;

      if (audio_url) {
        audioBuffer = await downloadBuffer(audio_url);
        const urlPath = new URL(audio_url).pathname;
        resolvedFilename = urlPath.split("/").pop() || filename || "audio.mp3";
      } else {
        audioBuffer = Buffer.from(audio_base64!, "base64");
        resolvedFilename = filename || "audio.mp3";
      }

      const ext = resolvedFilename.split(".").pop()?.toLowerCase();
      if (!ext || !SUPPORTED_FORMATS.includes(ext)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Formato '${ext}' não suportado. Use: ${SUPPORTED_FORMATS.join(", ")}.`,
            },
          ],
          isError: true,
        };
      }

      // Converte Buffer para ArrayBuffer para compatibilidade com File
      const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      ) as ArrayBuffer;

      const file = new File([arrayBuffer], resolvedFilename, {
        type: `audio/${ext}`,
      });

      const transcription = await client.audio.transcriptions.create({
        model: "whisper-1",
        file,
        language: language || "pt",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: transcription.text,
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Firebase Cloud Function: MCP server via Streamable HTTP transport.
 * Endpoint: POST /mcp
 * Autenticacao: Bearer token via Firebase Secret MCP_SECRET.
 */
export const mcp = onRequest(
  {
    secrets: [OPENAI_API_KEY, MCP_SECRET],
    timeoutSeconds: 300,
    memory: "512MiB",
    region: "us-central1",
    cors: false,
  },
  async (req, res) => {
    // So aceita POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST /mcp." });
      return;
    }

    // Autenticacao via Bearer token
    const mcpSecret = MCP_SECRET.value();
    if (mcpSecret) {
      const authHeader = (req.headers["authorization"] as string) || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
      if (token !== mcpSecret) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }
    }

    try {
      const server = buildMcpServer(OPENAI_API_KEY.value());
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      server.close();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("MCP handler error:", err);
      res
        .status(500)
        .json({ error: "Internal server error.", detail: message });
    }
  }
);
