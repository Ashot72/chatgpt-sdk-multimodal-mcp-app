import shortid from "shortid";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const audioSchema = {
  prompt: z.string().describe("Prompt to generate audio"),
};

async function audioFile(prompt: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure public/mp3 directory exists
      const publicMp3Dir = path.join(process.cwd(), "public", "mp3");
      if (!fs.existsSync(publicMp3Dir)) {
        fs.mkdirSync(publicMp3Dir, { recursive: true });
      }

      const uniqueID = shortid.generate();
      const gTTS = (await import("gtts")).default;
      const gtts = new gTTS(prompt, "en");

      const filePath = path.join(publicMp3Dir, `${uniqueID}.mp3`);
      gtts.save(filePath, function (err: any) {
        if (err) {
          console.error("Error saving audio file:", err);
          reject(new Error(`Failed to save audio file: ${err.message}`));
        } else {
          resolve(uniqueID);
        }
      });
    } catch (error) {
      console.error("Error in audioFile function:", error);
      reject(
        new Error(
          `Failed to generate audio: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
    }
  });
}

export default function registerAudioTool(server: McpServer) {
  server.registerTool(
    "Audio Tool",
    {
      title: "Audio Tool",
      description: "Text content to convert into an audio file",
      inputSchema: audioSchema,
    },
    async ({ prompt }: { prompt: string }) => {
      try {
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Prompt cannot be empty");
        }

        const audioId = await audioFile(prompt);

        // Use public URL
        const publicAudioUrl = `/mp3/${audioId}.mp3`;

        console.log("Audio URL:", publicAudioUrl);

        return {
          content: [
            {
              type: "text",
              text: publicAudioUrl,
            },
          ],
        };
      } catch (error) {
        console.error("Error in audio tool:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error generating audio: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );
}
