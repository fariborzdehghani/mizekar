import "server-only";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiChatCompletionInput = {
  messages: AiChatMessage[];
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  maxTokens?: number;
  temperature?: number;
};

type AiChatCompletionResult =
  | {
      success: true;
      text: string;
    }
  | {
      success: false;
      error: string;
    };

type AiConnectionMode = "lm-studio" | "openai-compatible";

type AiChatCompletionConfig =
  | {
      success: true;
      connectionMode: AiConnectionMode;
      endpoint: string;
      model: string;
      apiKey?: string;
    }
  | {
      success: false;
      error: string;
    };

const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234";
const DEFAULT_LM_STUDIO_MODEL = "google/gemma-3-4b";
const DEFAULT_OPENAI_COMPATIBLE_BASE_URL = "https://api.openai.com";

export function readAiString(
  names: Array<string | undefined>,
  fallback = ""
) {
  for (const name of names) {
    if (!name) continue;

    const value = process.env[name]?.trim();

    if (value) return value;
  }

  return fallback;
}

export function readAiNumber(names: Array<string | undefined>, fallback: number) {
  for (const name of names) {
    if (!name) continue;

    const rawValue = process.env[name]?.trim();
    if (!rawValue) continue;

    const value = Number(rawValue);

    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function normalizeAiConnectionMode(value: string): AiConnectionMode | "" | null {
  if (!value) return "";

  const normalizedValue = value.trim().toLowerCase().replace(/[_\s]+/g, "-");

  if (["lm-studio", "lmstudio", "local"].includes(normalizedValue)) {
    return "lm-studio";
  }

  if (
    ["openai-compatible", "openai", "compatible"].includes(normalizedValue)
  ) {
    return "openai-compatible";
  }

  return null;
}

function getAiConnectionMode():
  | { success: true; connectionMode: AiConnectionMode }
  | { success: false; error: string } {
  const rawConnectionMode = readAiString(["AI_CONNECTION_MODE", "AI_PROVIDER"]);
  const normalizedConnectionMode =
    normalizeAiConnectionMode(rawConnectionMode);

  if (normalizedConnectionMode === null) {
    return {
      success: false,
      error: `Unsupported AI_CONNECTION_MODE "${rawConnectionMode}". Use "lm-studio" or "openai-compatible".`,
    };
  }

  if (normalizedConnectionMode) {
    return {
      success: true,
      connectionMode: normalizedConnectionMode,
    };
  }

  const hasOpenAiCompatibleConfig = Boolean(
    readAiString([
      "AI_API_URL",
      "AI_CHAT_COMPLETIONS_URL",
      "OPENAI_COMPATIBLE_AI_API_URL",
      "OPENAI_COMPATIBLE_AI_CHAT_COMPLETIONS_URL",
      "OPENAI_API_URL",
    ])
  );

  return {
    success: true,
    connectionMode: hasOpenAiCompatibleConfig
      ? "openai-compatible"
      : "lm-studio",
  };
}

function shouldReadLmStudioAliases() {
  const modeResult = getAiConnectionMode();

  return modeResult.success && modeResult.connectionMode === "lm-studio";
}

export function readAiProviderString(
  names: string[],
  lmStudioAliasNames: string[],
  fallback = ""
) {
  return readAiString(
    shouldReadLmStudioAliases() ? [...names, ...lmStudioAliasNames] : names,
    fallback
  );
}

export function readAiProviderNumber(
  names: string[],
  lmStudioAliasNames: string[],
  fallback: number
) {
  return readAiNumber(
    shouldReadLmStudioAliases() ? [...names, ...lmStudioAliasNames] : names,
    fallback
  );
}

function toChatCompletionsEndpoint(url: string) {
  if (!url) return "";

  const trimmedUrl = url.trim();
  const queryIndex = trimmedUrl.indexOf("?");
  const urlWithoutQuery =
    queryIndex >= 0 ? trimmedUrl.slice(0, queryIndex) : trimmedUrl;
  const query = queryIndex >= 0 ? trimmedUrl.slice(queryIndex) : "";
  const normalizedUrl = urlWithoutQuery.replace(/\/+$/, "");

  if (/\/chat\/completions$/i.test(normalizedUrl)) {
    return `${normalizedUrl}${query}`;
  }

  if (/\/v\d+$/i.test(normalizedUrl)) {
    return `${normalizedUrl}/chat/completions${query}`;
  }

  return `${normalizedUrl}/v1/chat/completions${query}`;
}

function getAiChatCompletionConfig(): AiChatCompletionConfig {
  const modeResult = getAiConnectionMode();

  if (!modeResult.success) return modeResult;

  const { connectionMode } = modeResult;
  const isLmStudio = connectionMode === "lm-studio";
  const endpoint = toChatCompletionsEndpoint(
    readAiString(
      isLmStudio
        ? [
            "AI_API_URL",
            "AI_CHAT_COMPLETIONS_URL",
            "LM_STUDIO_AI_CHAT_COMPLETIONS_URL",
          ]
        : [
            "AI_API_URL",
            "AI_CHAT_COMPLETIONS_URL",
            "OPENAI_COMPATIBLE_AI_API_URL",
            "OPENAI_COMPATIBLE_AI_CHAT_COMPLETIONS_URL",
            "OPENAI_API_URL",
          ],
      readAiString(
        isLmStudio
          ? ["AI_API_BASE_URL", "AI_BASE_URL", "LM_STUDIO_AI_BASE_URL"]
          : [
              "AI_API_BASE_URL",
              "AI_BASE_URL",
              "OPENAI_COMPATIBLE_AI_BASE_URL",
              "OPENAI_API_BASE_URL",
            ],
        isLmStudio
          ? DEFAULT_LM_STUDIO_BASE_URL
          : DEFAULT_OPENAI_COMPATIBLE_BASE_URL
      )
    )
  );
  const model = readAiString(
    isLmStudio
      ? ["AI_MODEL", "LM_STUDIO_AI_MODEL"]
      : ["AI_MODEL", "OPENAI_COMPATIBLE_AI_MODEL", "OPENAI_MODEL"],
    isLmStudio ? DEFAULT_LM_STUDIO_MODEL : ""
  );
  const apiKey = readAiString(
    isLmStudio
      ? ["AI_API_KEY", "LM_STUDIO_AI_API_KEY"]
      : ["AI_API_KEY", "OPENAI_COMPATIBLE_AI_API_KEY", "OPENAI_API_KEY"]
  );

  if (!endpoint || !model) {
    return {
      success: false,
      error:
        "AI model environment variables are missing. Set AI_CONNECTION_MODE, AI_API_URL or AI_API_BASE_URL, and AI_MODEL.",
    };
  }

  return {
    success: true,
    connectionMode,
    endpoint,
    model,
    apiKey,
  };
}

function getTextFromAiResponse(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) {
    const message = (data as { message?: unknown }).message;
    if (message && typeof message === "object") {
      const content = (message as { content?: unknown }).content;
      if (typeof content === "string") return content;
    }

    return "";
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return "";

  const delta = (firstChoice as { delta?: unknown }).delta;
  if (delta && typeof delta === "object") {
    const content = (delta as { content?: unknown }).content;
    if (typeof content === "string") return content;
  }

  const choiceMessage = (firstChoice as { message?: unknown }).message;
  if (choiceMessage && typeof choiceMessage === "object") {
    const content = (choiceMessage as { content?: unknown }).content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object") {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  const text = (firstChoice as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function removeThinkingBlocks(text: string) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();
}

function createThinkingBlockFilter() {
  const openTag = "<think>";
  const closeTag = "</think>";
  let buffer = "";
  let inThinkingBlock = false;

  return {
    push(value: string) {
      buffer += value;
      let output = "";

      while (buffer) {
        if (inThinkingBlock) {
          const closeIndex = buffer.toLowerCase().indexOf(closeTag);

          if (closeIndex < 0) {
            buffer = buffer.slice(Math.max(0, buffer.length - closeTag.length));
            return output;
          }

          buffer = buffer.slice(closeIndex + closeTag.length);
          inThinkingBlock = false;
          continue;
        }

        const openIndex = buffer.toLowerCase().indexOf(openTag);

        if (openIndex < 0) {
          const emitLength = Math.max(0, buffer.length - openTag.length);
          output += buffer.slice(0, emitLength);
          buffer = buffer.slice(emitLength);
          return output;
        }

        output += buffer.slice(0, openIndex);
        buffer = buffer.slice(openIndex + openTag.length);
        inThinkingBlock = true;
      }

      return output;
    },
    flush() {
      if (inThinkingBlock) return "";

      const output = buffer;
      buffer = "";
      return output;
    },
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEndpointHost(endpoint: string) {
  try {
    return new URL(endpoint).hostname || endpoint;
  } catch {
    return endpoint;
  }
}

function getNestedErrorValue(error: unknown, key: "code" | "hostname") {
  let current: unknown = error;

  while (current && typeof current === "object") {
    const value = (current as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
    current = (current as { cause?: unknown }).cause;
  }

  return "";
}

function isTransientNetworkError(error: unknown) {
  const code = getNestedErrorValue(error, "code");
  const name = error instanceof Error ? error.name : "";

  return [
    "EAI_AGAIN",
    "ECONNRESET",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET",
  ].includes(code) || ["AbortError", "TimeoutError"].includes(name);
}

function getAiRequestErrorMessage(
  error: unknown,
  endpoint: string,
  timeoutMs: number
) {
  const code = getNestedErrorValue(error, "code");
  const hostname =
    getNestedErrorValue(error, "hostname") || getEndpointHost(endpoint);
  const name = error instanceof Error ? error.name : "";

  if (code === "EAI_AGAIN") {
    return `AI service DNS lookup failed for ${hostname}. This is usually temporary; check network/DNS connectivity and AI_API_URL or AI_API_BASE_URL.`;
  }

  if (code === "ENOTFOUND") {
    return `AI service host ${hostname} could not be found. Check AI_API_URL or AI_API_BASE_URL.`;
  }

  if (code === "ECONNREFUSED") {
    return `AI service refused the connection at ${hostname}. Check that the configured AI service is running.`;
  }

  if (["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return `AI service request timed out while connecting to ${hostname}.`;
  }

  if (["AbortError", "TimeoutError"].includes(name)) {
    return `AI service did not respond within ${Math.round(timeoutMs / 1000)} seconds.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "AI request could not be completed.";
}

function getAiChatCompletionRequestBody({
  connectionMode,
  messages,
  maxTokens,
  model,
  stream,
  temperature,
}: AiChatCompletionInput & {
  connectionMode: AiConnectionMode;
  model: string;
  stream: boolean;
}) {
  const useLmStudioAliases = connectionMode === "lm-studio";

  return {
    model,
    messages,
    stream,
    max_tokens:
      maxTokens ??
      readAiNumber(
        useLmStudioAliases
          ? ["AI_MAX_TOKENS", "LM_STUDIO_AI_MAX_TOKENS"]
          : ["AI_MAX_TOKENS"],
        3000
      ),
    temperature:
      temperature ??
      readAiNumber(
        useLmStudioAliases
          ? ["AI_TEMPERATURE", "LM_STUDIO_AI_TEMPERATURE"]
          : ["AI_TEMPERATURE"],
        0.7
      ),
  };
}

async function sendAiChatCompletionRequest({
  messages,
  timeoutMs,
  retries,
  retryDelayMs,
  maxTokens,
  temperature,
}: AiChatCompletionInput): Promise<AiChatCompletionResult> {
  const config = getAiChatCompletionConfig();

  if (!config.success) {
    return {
      success: false,
      error: config.error,
    };
  }

  const { apiKey, connectionMode, endpoint, model } = config;
  const useLmStudioAliases = connectionMode === "lm-studio";
  const requestTimeoutMs =
    timeoutMs ??
    readAiNumber(
      useLmStudioAliases
        ? ["AI_TIMEOUT_MS", "LM_STUDIO_AI_TIMEOUT_MS"]
        : ["AI_TIMEOUT_MS"],
      300000
    );
  const maxAttempts = Math.max(
    1,
    Math.trunc(
      retries ??
        readAiNumber(
          useLmStudioAliases
            ? ["AI_RETRIES", "LM_STUDIO_AI_RETRIES"]
            : ["AI_RETRIES"],
          2
        )
    ) +
      1
  );
  const requestRetryDelayMs =
    retryDelayMs ??
    readAiNumber(
      useLmStudioAliases
        ? ["AI_RETRY_DELAY_MS", "LM_STUDIO_AI_RETRY_DELAY_MS"]
        : ["AI_RETRY_DELAY_MS"],
      500
    );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...getAiChatCompletionRequestBody({
            connectionMode,
            messages,
            maxTokens,
            model,
            stream: false,
            temperature,
          }),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `AI request failed with ${response.status}: ${errorText.slice(0, 500)}`,
        };
      }

      const data: unknown = await response.json();
      const text = removeThinkingBlocks(getTextFromAiResponse(data));

      if (!text) {
        return {
          success: false,
          error: "AI response did not include message content.",
        };
      }

      return {
        success: true,
        text,
      };
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isTransientNetworkError(error);

      if (shouldRetry) {
        console.warn(
          `AI request failed on attempt ${attempt}; retrying...`,
          error
        );
        await wait(requestRetryDelayMs * attempt);
        continue;
      }

      console.error("AI request:", error);

      return {
        success: false,
        error: getAiRequestErrorMessage(error, endpoint, requestTimeoutMs),
      };
    }
  }

  return {
    success: false,
    error: "AI request could not be completed.",
  };
}

async function* streamAiChatCompletionRequest({
  messages,
  timeoutMs,
  maxTokens,
  temperature,
}: AiChatCompletionInput): AsyncGenerator<string> {
  const config = getAiChatCompletionConfig();

  if (!config.success) {
    throw new Error(config.error);
  }

  const { apiKey, connectionMode, endpoint, model } = config;
  const useLmStudioAliases = connectionMode === "lm-studio";
  const requestTimeoutMs =
    timeoutMs ??
    readAiNumber(
      useLmStudioAliases
        ? ["AI_TIMEOUT_MS", "LM_STUDIO_AI_TIMEOUT_MS"]
        : ["AI_TIMEOUT_MS"],
      300000
    );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...getAiChatCompletionRequestBody({
        connectionMode,
        messages,
        maxTokens,
        model,
        stream: true,
        temperature,
      }),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI request failed with ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  if (!response.body) {
    throw new Error("AI response did not include a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const thinkingFilter = createThinkingBlockFilter();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.startsWith(":")) continue;

        const payload = trimmedLine.startsWith("data:")
          ? trimmedLine.slice(5).trim()
          : trimmedLine;

        if (!payload || payload === "[DONE]") continue;

        const data = JSON.parse(payload) as unknown;
        const text = getTextFromAiResponse(data);
        if (!text) continue;

        const visibleText = thinkingFilter.push(text);
        if (visibleText) yield visibleText;
      }
    }

    const remaining = `${buffer}${decoder.decode()}`.trim();
    if (remaining) {
      for (const line of remaining.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(":")) continue;

        const payload = trimmedLine.startsWith("data:")
          ? trimmedLine.slice(5).trim()
          : trimmedLine;

        if (!payload || payload === "[DONE]") continue;

        const data = JSON.parse(payload) as unknown;
        const text = getTextFromAiResponse(data);
        if (text) {
          const visibleText = thinkingFilter.push(text);
          if (visibleText) yield visibleText;
        }
      }
    }

    const finalText = thinkingFilter.flush();
    if (finalText) yield finalText;
  } catch (error) {
    throw new Error(getAiRequestErrorMessage(error, endpoint, requestTimeoutMs));
  } finally {
    reader.releaseLock();
  }
}

export async function requestAiChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: Omit<AiChatCompletionInput, "messages"> = {}
): Promise<AiChatCompletionResult> {
  return sendAiChatCompletionRequest({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...options,
  });
}

export async function* streamAiChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: Omit<AiChatCompletionInput, "messages"> = {}
): AsyncGenerator<string> {
  yield* streamAiChatCompletionRequest({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...options,
  });
}
