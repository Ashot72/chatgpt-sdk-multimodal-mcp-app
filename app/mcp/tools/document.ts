import { z } from "zod";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const documentSchema = {
  prompt: z.string().describe("Prompt to retrive documents with links"),
};

export default function registerDocumentTool(server: McpServer) {
  server.registerTool(
    "Document Tool",
    {
      title: "Document Tool",
      description: "Retrieves documents with links based on the given prompt",
      inputSchema: documentSchema,
    },
    async ({ prompt }: { prompt: string }) => {
      try {
        // Input validation
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Prompt cannot be empty");
        }

        if (!process.env.TAVILY_API_KEY) {
          throw new Error("Tavily API key is not configured");
        }

        const retriever = new TavilySearchAPIRetriever({
          k: 3,
          apiKey: process.env.TAVILY_API_KEY,
        });

        const retrievedDocuments = await retriever.invoke(prompt);

        if (!retrievedDocuments || retrievedDocuments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No documents found for the given prompt. Please try with different keywords.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(retrievedDocuments, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error in document tool:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving documents: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );
}

/*
Recent Microsoft Documents on AI
*/
