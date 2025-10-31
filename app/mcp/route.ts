import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  registerChartTool,
  registerDocumentTool,
  registerVideoTool,
  registerAudioTool,
  registerImageTool,
} from "./tools";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string): Promise<string> => {
    const result = await fetch(`${baseUrl}${path}`);
    return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
    "openai/widgetPrefersBorder": true
  } as const;
}

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  const contentWidget: ContentWidget = {
    id: "show_ui",
    title: "Multi Modal MCP UI",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading UI...",
    invoked: "UI ready",
    html: html,
    description:
      "Interactive UI app for rendering widgets, charts, videos, images, and multimedia content",
    widgetDomain: "https://github.com/Ashot72/Multi-Modal-MCP-Server-Client"
  };
  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/resultCanProduceWidget": true,
        "openai/widgetAccessible": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/resultCanProduceWidget": true,
            "openai/widgetAccessible": true,
            "openai/widgetDomain": contentWidget.widgetDomain
          },
        },
      ],
    })
  );

  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Interactive UI app that renders widgets, charts, videos, images, and multimedia content. Use this to display rich UI components in ChatGPT.",
      inputSchema: {
        name: z.string().describe("Optional identifier or label for the UI widget display"),
      },
      _meta: widgetMeta(contentWidget),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
    async ({ name }) => {
      return {
        content: [],
        structuredContent: {
          name: name,
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(contentWidget),
      };
    }
  );

  // Register all additional tools
  registerChartTool(server);
  registerDocumentTool(server);
  registerVideoTool(server);
  registerAudioTool(server);
  registerImageTool(server);
});

export const GET = handler;
export const POST = handler;
