import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OpenAI from "openai";

const chartSchema = {
  prompt: z.string().describe("Prompt to retrieve chart data"),
};

export default function registerChartTool(server: McpServer) {
  server.registerTool(
    "Chart Tool",
    {
      title: "Chart Tool",
      description: "Retrieves chart data based on the given prompt",
      inputSchema: chartSchema,
    },
    async ({ prompt }: { prompt: string }) => {
      try {
        // Input validation
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Prompt cannot be empty");
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not configured");
        }

        const model = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const result = await model?.responses.create({
          model: "gpt-4o-mini",
          instructions: `You are a chart generator. Given a user prompt, return a JSON object with chart data. 
            The output must be a valid JSON object matching this structure:

           {
            "title": "Sales for Q1 2024",
            "type": "bar",
            "data": [
              { "label": "January", "value": 10000 },
              { "label": "February", "value": 12000 },
              { "label": "March", "value": 14000 }
            ]
          }

            Only respond with the JSON data, nothing else.`,
          input: [{ role: "user", content: prompt }],
        });

        console.log("Chart generation result:", result);

        if (!result) {
          throw new Error("No response received from OpenAI API");
        }

        if (result?.output.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No chart data generated. Please try with a different prompt.",
              },
            ],
          };
        }

        const chartData = result?.output[0] || "No chart data generated";

        return {
          content: [
            {
              type: "text",
              text: typeof chartData === "string" ? chartData : JSON.stringify(chartData),
            },
          ],
        };
      } catch (error) {
        console.error("Error in chart tool:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error generating chart: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );
}

/*
Can you provide information about Donald Trump's 2024 election campaign, divided into at least five groups? We want to retrieve data.
*/
