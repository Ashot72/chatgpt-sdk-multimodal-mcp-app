import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OpenAI from "openai";

const imageSchema = {
  prompt: z.string().describe("Prompt to generate an image"),
};

async function dalleData(prompt: string): Promise<string> {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log("Generating image with prompt:", prompt);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      prompt: prompt,
      n: 1,
      size: "512x512",
      model: "dall-e-2",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data received from DALL-E API");
    }

    const imageURL = response.data[0].url;

    if (!imageURL || typeof imageURL !== "string") {
      throw new Error("Invalid image URL received from DALL-E API");
    }

    console.log("Image generated successfully:", imageURL);

    return imageURL;
  } catch (error) {
    console.error("Error in dalleData function:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("There was an error generating the image.");
  }
}

export default function registerImageTool(server: McpServer) {
  server.registerTool(
    "Image Tool",
    {
      title: "Image Tool",
      description: "Generates an image based on the given text prompt using DALL-E",
      inputSchema: imageSchema,
    },
    async ({ prompt }: { prompt: string }) => {
      try {
        // Input validation
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Prompt cannot be empty");
        }

        const url = await dalleData(prompt);

        return {
          content: [
            {
              type: "text",
              text: url,
            },
          ],
        };
      } catch (error) {
        console.error("Error in image tool:", error);

        return {
          content: [
            {
              type: "text",
              text: `Error generating image: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );
}
