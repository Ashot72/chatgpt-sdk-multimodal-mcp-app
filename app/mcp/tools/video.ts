import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import "dotenv/config";

interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode: string;
  pageInfo: PageInfo;
  items: SearchResult[];
}

interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
}

interface SearchResult {
  kind: string;
  etag: string;
  id: VideoId;
}

interface VideoId {
  kind: string;
  videoId: string;
}

const videoSchema = {
  prompt: z.string().describe("Prompt to retrive Youtube video id"),
};

async function videoUrl({ prompt }: { prompt: string }): Promise<YouTubeSearchResponse> {
  try {
    // Check if YouTube API key is configured
    if (!process.env.YOUTUBE_DATA_API_KEY) {
      throw new Error("YouTube Data API key is not configured");
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://www.googleapis.com/youtube/v3/search?q=${encodedPrompt}&maxResults=1&key=${process.env.YOUTUBE_DATA_API_KEY}`;

    console.log("Searching YouTube for:", prompt);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error:", response.status, errorText);

      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("YouTube API returned error:", data.error);
      throw new Error(`YouTube API error: ${data.error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in videoUrl function:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("There was an error fetching YouTube data.");
  }
}

export default function registerVideoTool(server: McpServer) {
  server.registerTool(
    "Video Tool",
    {
      title: "Video Tool",
      description: "Retrieves a Youtube video id based on the given prompt",
      inputSchema: videoSchema,
    },
    async ({ prompt }: { prompt: string }) => {
      try {
        // Input validation
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Prompt cannot be empty");
        }

        const youtubeData = await videoUrl({ prompt });

        if (!youtubeData || !youtubeData.items || youtubeData.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No YouTube videos found for the given prompt. Please try with different keywords.",
              },
            ],
          };
        }

        const videoId = youtubeData.items[0].id.videoId;

        if (!videoId) {
          return {
            content: [
              {
                type: "text",
                text: "No valid video ID found in the search results.",
              },
            ],
          };
        }

        console.log(`Found YouTube video with ID: ${videoId}`);

        return {
          content: [
            {
              type: "text",
              text: videoId,
            },
          ],
        };
      } catch (error) {
        console.error("Error in video tool:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving YouTube video: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );
}
