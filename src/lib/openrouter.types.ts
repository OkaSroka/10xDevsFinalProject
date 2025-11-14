export type JsonSchemaTypeName =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface JsonSchema {
  type?: JsonSchemaTypeName | JsonSchemaTypeName[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  enum?: unknown[];
  additionalProperties?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  description?: string;
  title?: string;
}

export interface ModelParameters {
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterServiceOptions {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  modelParameters?: ModelParameters;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
  referer?: string;
  appTitle?: string;
  logger?: Pick<typeof console, "info" | "warn" | "error">;
}

export interface ResponseFormatConfig {
  schema: JsonSchema;
  name: string;
  strict: boolean;
}

export interface ResponseFormatOptions {
  name?: string;
  strict?: boolean;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterMessageContentPart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface OpenRouterRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequestPayload extends ModelParameters {
  model: string;
  messages: OpenRouterRequestMessage[];
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: JsonSchema;
      strict: boolean;
    };
  };
}

export interface OpenRouterAssistantMessage {
  role: "assistant";
  content: string | OpenRouterMessageContentPart[];
  parsed?: unknown;
}

export interface OpenRouterChoice {
  index: number;
  finish_reason?: string;
  message: OpenRouterAssistantMessage;
}

export interface OpenRouterApiResponse {
  id: string;
  model: string;
  created?: number;
  usage?: OpenRouterUsage;
  choices: OpenRouterChoice[];
}

export interface OpenRouterErrorResponse {
  error?:
    | string
    | {
        message?: string;
        code?: string | number;
        type?: string;
      };
  message?: string;
}

export type ResponseType<TParsed = unknown> = OpenRouterChatResult<TParsed>;

export interface OpenRouterChatResult<TParsed = unknown> {
  id: string;
  model: string;
  content: string;
  parsed?: TParsed;
  usage?: OpenRouterUsage;
  finishReason?: string;
  raw: OpenRouterApiResponse;
}

export type OpenRouterServiceErrorCode =
  | "CONFIGURATION_ERROR"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "API_ERROR";

export interface OpenRouterServiceErrorOptions {
  cause?: unknown;
  detail?: unknown;
  status?: number;
}

export class OpenRouterServiceError extends Error {
  public readonly code: OpenRouterServiceErrorCode;
  public readonly status?: number;
  public readonly detail?: unknown;

  constructor(
    message: string,
    code: OpenRouterServiceErrorCode,
    options?: OpenRouterServiceErrorOptions,
  ) {
    super(message);
    this.name = "OpenRouterServiceError";
    this.code = code;
    this.status = options?.status;
    this.detail = options?.detail;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}
