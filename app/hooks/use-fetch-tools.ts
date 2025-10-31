import { useState, useCallback, useRef, useEffect } from "react";

interface Tool {
  name: string;
  description?: string;
  annotations?: {
    description: string;
  };
}

interface UseFetchToolsOptions {
  onSuccess: (tools: Tool[]) => void;
  onError: (error: string | null) => void;
  onClientChange: (connected: boolean) => void;
}

// Tool to filter out from UI (internal widget)
const HIDDEN_TOOL = "show_ui";

export function useFetchTools(options: UseFetchToolsOptions) {
  const [loading, setLoading] = useState(false);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    optionsRef.current.onError(null);

    try {
      const response = await fetch("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        console.log("Content-Type:", contentType);

        // Handle text/event-stream (SSE) response
        if (contentType?.includes("text/event-stream")) {
          const text = await response.text();

          const lines = text.split("\n");
          let jsonData = null;

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                jsonData = JSON.parse(line.substring(6));
                break;
              } catch (e) {
                // Continue to next line
              }
            }
          }

          if (jsonData?.result?.tools) {
            // Filter out internal widget tool from UI
            const filteredTools = jsonData.result.tools.filter(
              (tool: Tool) => tool.name !== HIDDEN_TOOL
            );
            optionsRef.current.onSuccess(filteredTools);
            optionsRef.current.onClientChange(true);
            optionsRef.current.onError(null);
          } else {
            console.error("No tools found in server response:", jsonData);
            optionsRef.current.onClientChange(false);
            optionsRef.current.onError("No tools found in server response.");
          }
        } else if (contentType?.includes("application/json")) {
          // Direct JSON response (fallback)
          const data = await response.json();
          console.log("JSON response:", data);

          if (data.result?.tools) {
            // Filter out internal widget tool from UI
            const filteredTools = data.result.tools.filter(
              (tool: Tool) => tool.name !== HIDDEN_TOOL
            );
            optionsRef.current.onSuccess(filteredTools);
            optionsRef.current.onClientChange(true);
            optionsRef.current.onError(null);
          } else {
            console.error("No tools found in serverresponse:", data);
            optionsRef.current.onClientChange(false);
            optionsRef.current.onError("No tools found in server response.");
          }
        } else {
          console.error("Unknown content type:", contentType);
          optionsRef.current.onClientChange(false);
          optionsRef.current.onError(`Unknown content type: ${contentType}`);
        }
      } else {
        console.error("Failed to fetch tools:", response.status, response.statusText);
        optionsRef.current.onClientChange(false);
        optionsRef.current.onError(
          `Failed to fetch tools: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to fetch tools:", error);
      optionsRef.current.onClientChange(false);
      optionsRef.current.onError("Failed to fetch tools. See console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchTools, loading };
}
