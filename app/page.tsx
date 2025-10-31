"use client";

import { useState, useEffect } from "react";
import {
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
  useCallTool,
  useWidgetState,
  useOpenExternal,
  useFetchTools,
} from "./hooks";
import { ChartJS } from "./components/chart";

// Tool type names for renderOutput switch
const TOOL_NAMES = {
  CHART: "Chart Tool",
  DOCUMENT: "Document Tool",
  VIDEO: "Video Tool",
  AUDIO: "Audio Tool",
  IMAGE: "Image Tool",
} as const;

interface Tool {
  name: string;
  description?: string;
  annotations?: {
    description: string;
  };
}

interface ResultItem {
  tool: string;
  result: string;
}

interface AppState {
  results: ResultItem[];
  query: string;
  selectedTool?: string;
  showTools: boolean;
  [key: string]: unknown;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [mounted, setMounted] = useState(false);

  // Widget state for persistent data storage
  const [appState, setAppState] = useWidgetState<AppState>({
    results: [],
    query: "",
    selectedTool: undefined,
    showTools: false
  });

  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const callTool = useCallTool();
  const openExternal = useOpenExternal();

  // Fetch tools hook
  const { fetchTools, loading: toolsLoading } = useFetchTools({
    onSuccess: (filteredTools) => {
      setTools(filteredTools);
      setAppState((prev) => ({ ...prev, client: true }));
      setError(null);
    },
    onError: setError,
    onClientChange: (connected) => {
      setAppState((prev) => ({ ...prev, client: connected }));
    },
  });

  // Fetch tools on component mount
  useEffect(() => {
    fetchTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchTools is stable from useFetchTools hook

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!safeAppState.selectedTool) {
      setError("No tool selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await callTool(safeAppState.selectedTool, {
        prompt: safeAppState.query,
      });

      if (response?.result) {
        const result: string = response.result;
        setAppState((prevState) => ({
          ...prevState,
          results: [...(prevState?.results || []), { tool: safeAppState.selectedTool!, result }],
        }));
        setError(null); // Clear any previous errors on success
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(`Tool call failed: ${(err as Error).message}`);
      console.error("Tool call error:", err);
    } finally {
      setLoading(false);
      setAppState((prev) => ({ ...prev, query: "" }));
    }
  };

  function renderOutput(toolName: string, searchResult: string) {
    switch (toolName) {
      case TOOL_NAMES.CHART:
        try {
          const parsed = JSON.parse(searchResult);
          const chartData = JSON.parse(parsed.content[0].text);
          return (
            <span>
              <ChartJS {...chartData} />
            </span>
          );
        } catch (error) {
          return (
            <span className="text-red-500">
              Error parsing chart data: {error instanceof Error ? error.message : "Unknown error"}
            </span>
          );
        }
      case TOOL_NAMES.DOCUMENT:
        try {
          const docs: {
            metadata: {
              source: string;
              title: string;
            };
            pageContent: string;
          }[] = JSON.parse(searchResult);
          return (
            <div className="grid gap-4">
              {docs.map((doc, idx) => (
                <div
                  key={`doc-${idx}-${doc.metadata.source}`}
                  className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    <a
                      href={doc.metadata.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {doc.metadata.title}
                    </a>
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">{doc.pageContent}</p>
                </div>
              ))}
            </div>
          );
        } catch (error) {
          return (
            <span className="text-red-500">
              Error parsing document data:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </span>
          );
        }
      case TOOL_NAMES.VIDEO:
        // Extract videoId from searchResult (could be just ID or full URL)
        const videoIdMatch = searchResult.match(
          /(?:youtube\.com\/embed\/|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/
        );
        const videoId = videoIdMatch ? videoIdMatch[1] : searchResult.trim();

        if (!videoId || videoId.length !== 11) {
          return <span className="text-red-500">Invalid YouTube video ID: {searchResult}</span>;
        }

        // Build YouTube watch URL
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        return (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Thumbnail */}
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openExternal(youtubeUrl);
                }}
                className="block group relative cursor-pointer"
              >
                <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                  <img
                    src={thumbnailUrl}
                    alt="YouTube Video"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </a>

              {/* YouTube-style caption */}
              <div className="p-3">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    openExternal(youtubeUrl);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>
        );
      case TOOL_NAMES.AUDIO:
        return (
          <span>
            <audio controls style={{ width: "100%" }}>
              <source src={searchResult} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </span>
        );
      case TOOL_NAMES.IMAGE:
        return (
          <div className="flex justify-center items-center">
            <img
              src={searchResult}
              alt="Image"
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          </div>
        );
      default:
        return <span>{searchResult}</span>;
    }
  }

  // Use safe defaults when appState is null
  const safeAppState = appState || {
    results: [],
    query: "",
    selectedTool: undefined,
    showTools: false,
    client: false,
  };

  return (
    <div
      suppressHydrationWarning
      className={`w-full max-w-2xl mx-auto px-4 flex flex-col min-h-[90vh] ${
        (safeAppState.results?.length || 0) === 0 ? "justify-center" : ""
      }`}
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}
      <div className="flex-shrink-0">
        {mounted && !isChatGptApp && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Running in standalone mode. This app is designed to run inside ChatGPT.
            </p>
          </div>
        )}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Multi Modal MCP</h1>
          <div className="flex items-center justify-center gap-4">
            {mounted && (
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${safeAppState.client ? "bg-green-500" : "bg-red-500"}`}
                />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {safeAppState.client ? "Connected to MCP" : "Connecting to MCP..."}
                </p>
              </div>
            )}
            <button
              onClick={() =>
                setAppState((prev) => ({ ...prev, showTools: !(prev?.showTools ?? false) }))
              }
              className="text-sm text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors p-2 rounded-full cursor-pointer"
            >
              {safeAppState.showTools ? "Hide Tools" : "Show Tools"}
            </button>
            <button
              onClick={fetchTools}
              disabled={toolsLoading}
              className={`text-sm transition-colors p-2 rounded-full cursor-pointer ${
                toolsLoading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              }`}
            >
              {toolsLoading ? "Loading..." : "Refresh Tools"}
            </button>
          </div>
        </header>

        {safeAppState.showTools && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Available Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((toolObj, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-colors duration-200 \
                    ${
                      toolObj.name === safeAppState.selectedTool
                        ? "bg-teal-100 dark:bg-teal-800 border-teal-400 dark:border-teal-500"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                    }
                  `}
                >
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    {toolObj.name}
                  </h3>
                  <button
                    className="group flex items-center gap-2 text-sm text-teal-600 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-100 focus:outline-none text-left cursor-pointer"
                    onClick={() => setAppState((prev) => ({ ...prev, selectedTool: toolObj.name }))}
                  >
                    <span>{toolObj.description || "No description available"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleChat} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={safeAppState.query || ""}
              onChange={(e) => setAppState((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="Search..."
              className="w-full border h-12 shadow p-4 rounded-full dark:text-gray-800 dark:border-gray-700 dark:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              type="submit"
              disabled={loading || !safeAppState.client}
              className="absolute top-1.5 right-2.5 transition-colors duration-200 bg-gray-200 dark:bg-gray-900 p-2 rounded-full"
            >
              <svg
                className={`h-5 w-5 fill-current ${
                  loading || !safeAppState.client
                    ? "text-gray-400"
                    : "text-teal-400 dark:text-teal-300 hover:text-teal-500 dark:hover:text-teal-400"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 56.966 56.966"
              >
                <path d="M55.146,51.887L41.588,37.786c3.486-4.144,5.396-9.358,5.396-14.786c0-12.682-10.318-23-23-23s-23,10.318-23,23s10.318,23,23,23c4.761,0,9.298-1.436,13.177-4.162l13.661,14.208c0.571,0.593,1.339,0.92,2.162,0.92c0.779,0,1.518-0.297,2.079-0.837C56.255,54.982,56.293,53.08,55.146,51.887z M23.984,6c9.374,0,17,7.626,17,17s-7.626,17-17,17s-17-7.626-17-17S14.61,6,23.984,6z" />
              </svg>
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-8 text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center mb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          </div>
        )}
      </div>

      {(safeAppState.results?.length || 0) > 0 && (
        <div className="space-y-6 flex-grow mt-8 mb-8">
          {safeAppState.results.map((result, index) => (
            <div
              key={`result-${index}-${result.tool}`}
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              {renderOutput(result.tool, result.result)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
