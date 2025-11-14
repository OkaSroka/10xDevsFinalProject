import { OpenRouterServiceError } from "./openrouter.types";
import type {
  JsonSchema,
  JsonSchemaTypeName,
  ModelParameters,
  OpenRouterServiceOptions,
  ResponseFormatConfig,
  ResponseFormatOptions,
  OpenRouterRequestMessage,
  OpenRouterRequestPayload,
  OpenRouterAssistantMessage,
  OpenRouterApiResponse,
  OpenRouterErrorResponse,
  OpenRouterChatResult,
  ResponseType,
} from "./openrouter.types";

export { OpenRouterServiceError } from "./openrouter.types";
export type {
  JsonSchema,
  OpenRouterUsage,
  ResponseFormatOptions,
  ResponseType,
} from "./openrouter.types";

const DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL_NAME = "mistralai/mistral-7b-instruct:free";
const DEFAULT_MODEL_PARAMETERS: Required<ModelParameters> = {
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_SYSTEM_MESSAGE =
  "You are a helpful assistant that turns dense study materials into concise flashcards.";

const RETRIABLE_STATUS_CODES = new Set([
  408, // Request timeout
  409, // Conflict - retryable depending on backend load
  425,
  429,
  500,
  502,
  503,
  504,
  524,
]);

const globalProcessEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};

export class OpenRouterService {
  private readonly apiUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly backoffMultiplier: number;
  private readonly referer?: string;
  private readonly appTitle?: string;
  private readonly logger?: Pick<typeof console, "info" | "warn" | "error">;

  private apiKey?: string;
  private modelName: string;
  private modelParameters: ModelParameters;
  private currentSystemMessage: string = DEFAULT_SYSTEM_MESSAGE;
  private currentUserMessage = "";
  private responseFormat?: ResponseFormatConfig;
  private schemaCounter = 0;

  constructor(options?: OpenRouterServiceOptions) {
    const metaEnv = (import.meta as ImportMeta | undefined)?.env;

    this.apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries =
      typeof options?.maxRetries === "number"
        ? Math.max(0, options.maxRetries)
        : DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.backoffMultiplier =
      options?.backoffMultiplier && options.backoffMultiplier > 0
        ? options.backoffMultiplier
        : DEFAULT_BACKOFF_MULTIPLIER;
    this.referer = options?.referer;
    this.appTitle = options?.appTitle;
    this.logger = options?.logger ?? console;

    this.apiKey =
      options?.apiKey ??
      globalProcessEnv.OPENROUTER_API_KEY ??
      metaEnv?.OPENROUTER_API_KEY;

    this.modelName = options?.model?.trim() || DEFAULT_MODEL_NAME;
    this.modelParameters = {
      ...DEFAULT_MODEL_PARAMETERS,
      ...options?.modelParameters,
    };
  }

  setSystemMessage(message: string): void {
    this.currentSystemMessage = this.ensureNonEmptyMessage(
      message,
      "System message",
    );
  }

  clearSystemMessage(): void {
    this.currentSystemMessage = "";
  }

  setUserMessage(message: string): void {
    this.currentUserMessage = this.ensureNonEmptyMessage(
      message,
      "User message",
    );
  }

  clearUserMessage(): void {
    this.currentUserMessage = "";
  }

  setResponseFormat(schema: JsonSchema, options?: ResponseFormatOptions): void {
    if (!schema || typeof schema !== "object") {
      throw new OpenRouterServiceError(
        "Response schema must be a JSON object.",
        "VALIDATION_ERROR",
      );
    }

    const strict = options?.strict ?? true;

    const schemaName =
      options?.name?.trim() ||
      schema.title?.trim() ||
      this.generateSchemaName();

    if (!schemaName) {
      throw new OpenRouterServiceError(
        "Response schema name could not be determined.",
        "VALIDATION_ERROR",
      );
    }

    this.responseFormat = {
      schema,
      name: schemaName,
      strict,
    };
  }

  clearResponseFormat(): void {
    this.responseFormat = undefined;
  }

  setModel(name: string, parameters?: ModelParameters): void {
    if (typeof name !== "string" || !name.trim()) {
      throw new OpenRouterServiceError(
        "Model name must be a non-empty string.",
        "VALIDATION_ERROR",
      );
    }

    this.modelName = name.trim();
    if (parameters) {
      this.modelParameters = { ...this.modelParameters, ...parameters };
    }
  }

  async sendChatMessage<TParsed = unknown>(
    userMessage: string,
  ): Promise<ResponseType<TParsed>> {
    const resolvedUserMessage = userMessage?.trim()
      ? userMessage.trim()
      : this.currentUserMessage;

    if (!resolvedUserMessage) {
      throw new OpenRouterServiceError(
        "User message is required before sending a chat request.",
        "VALIDATION_ERROR",
      );
    }

    this.currentUserMessage = resolvedUserMessage;

    const payload = this.buildRequestPayload(resolvedUserMessage);
    const apiResponse = await this.executeRequest(payload);

    const choice = apiResponse.choices[0];
    if (!choice) {
      throw new OpenRouterServiceError(
        "The OpenRouter response did not include any choices.",
        "API_ERROR",
        { detail: apiResponse },
      );
    }

    const content = this.extractAssistantContent(choice.message);

    const result: OpenRouterChatResult<TParsed> = {
      id: apiResponse.id,
      model: apiResponse.model,
      content,
      usage: apiResponse.usage,
      finishReason: choice.finish_reason,
      raw: apiResponse,
    };

    if (this.responseFormat) {
      const parsed =
        this.parseStructuredPayload(choice.message) ??
        this.deserializeStructuredContent(content);

      this.validateAgainstSchema(this.responseFormat.schema, parsed);
      result.parsed = parsed as TParsed;
    }

    return result;
  }

  private buildRequestPayload(userMessage: string): OpenRouterRequestPayload {
    const messages: OpenRouterRequestMessage[] = [];

    if (this.currentSystemMessage) {
      messages.push({
        role: "system",
        content: this.currentSystemMessage,
      });
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    const payload: OpenRouterRequestPayload = {
      model: this.modelName,
      messages,
      ...this.buildModelParameters(),
    };

    if (this.responseFormat) {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: this.responseFormat.name,
          schema: this.responseFormat.schema,
          strict: this.responseFormat.strict,
        },
      };
    }

    return payload;
  }

  private buildModelParameters(): ModelParameters {
    const parameters: ModelParameters = {};
    for (const [key, value] of Object.entries(this.modelParameters)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        parameters[key as keyof ModelParameters] = value;
      }
    }
    return parameters;
  }

  private async executeRequest(
    payload: OpenRouterRequestPayload,
  ): Promise<OpenRouterApiResponse> {
    this.assertApiKey();

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      attempt += 1;
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
      this.logInfo("Dispatching OpenRouter request.", {
        attempt,
        model: payload.model,
      });

      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseText = await response.text();
        let parsedBody: unknown = {};

        if (responseText) {
          try {
            parsedBody = JSON.parse(responseText);
          } catch (parseError) {
            if (response.ok) {
              throw new OpenRouterServiceError(
                "Unable to parse OpenRouter JSON response.",
                "API_ERROR",
                { cause: parseError, detail: responseText },
              );
            }
            parsedBody = { message: responseText };
          }
        }

        if (!response.ok) {
          if (this.shouldRetry(response.status) && attempt <= this.maxRetries) {
            this.logWarn(
              `OpenRouter request attempt ${attempt} failed with status ${response.status}. Retrying...`,
              { status: response.status },
            );
            await this.delayForAttempt(attempt);
            continue;
          }

          this.logError("OpenRouter request returned error status.", {
            status: response.status,
          });

          throw new OpenRouterServiceError(
            this.extractErrorMessage(parsedBody) ??
              `OpenRouter request failed with status ${response.status}.`,
            response.status === 401 ? "CONFIGURATION_ERROR" : "API_ERROR",
            {
              status: response.status,
              detail: parsedBody,
            },
          );
        }

        return this.normalizeResponse(parsedBody);
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        if (timedOut) {
          this.logWarn(
            `OpenRouter request attempt ${attempt} timed out after ${this.timeoutMs}ms.`,
          );
          if (attempt > this.maxRetries) {
            break;
          }
          await this.delayForAttempt(attempt);
          continue;
        }

        if (error instanceof OpenRouterServiceError) {
          throw error;
        }

        if (this.isAbortError(error) || this.isFetchError(error)) {
          if (attempt > this.maxRetries) {
            break;
          }
          this.logWarn(
            `OpenRouter request attempt ${attempt} failed due to network error. Retrying...`,
          );
          await this.delayForAttempt(attempt);
          continue;
        }

        throw new OpenRouterServiceError(
          "Unexpected error while communicating with OpenRouter.",
          "NETWORK_ERROR",
          { cause: error },
        );
      }
    }

    this.logError("OpenRouter request exhausted all retry attempts.", {
      attempts: this.maxRetries + 1,
    });

    throw new OpenRouterServiceError(
      "OpenRouter request failed after all retry attempts.",
      "NETWORK_ERROR",
      { cause: lastError },
    );
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.referer) {
      headers["HTTP-Referer"] = this.referer;
    }

    if (this.appTitle) {
      headers["X-Title"] = this.appTitle;
    }

    return headers;
  }

  private extractAssistantContent(message: OpenRouterAssistantMessage): string {
    if (typeof message.content === "string") {
      const trimmed = message.content.trim();
      if (trimmed) {
        return trimmed;
      }
    }

    if (Array.isArray(message.content)) {
      const parts = message.content
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }
          if (
            part &&
            typeof part === "object" &&
            typeof part.text === "string"
          ) {
            return part.text;
          }
          return "";
        })
        .filter(Boolean);

      if (parts.length) {
        return parts.join("\n").trim();
      }
    }

    throw new OpenRouterServiceError(
      "Assistant response did not include textual content.",
      "API_ERROR",
      { detail: message },
    );
  }

  private parseStructuredPayload(
    message: OpenRouterAssistantMessage,
  ): unknown | undefined {
    if (typeof message.parsed === "object" && message.parsed !== null) {
      return message.parsed;
    }
    return undefined;
  }

  private deserializeStructuredContent(content: string): unknown {
    const normalized = this.stripCodeFences(content);
    try {
      return JSON.parse(normalized);
    } catch (error) {
      throw new OpenRouterServiceError(
        "Assistant response could not be parsed as JSON.",
        "VALIDATION_ERROR",
        { cause: error, detail: normalized },
      );
    }
  }

  private stripCodeFences(payload: string): string {
    const trimmed = payload.trim();
    const fenceMatch =
      /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed) ??
      /^```([\s\S]*?)```$/i.exec(trimmed);

    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }

    return trimmed;
  }

  private validateAgainstSchema(
    schema: JsonSchema,
    data: unknown,
    pointer = "#",
  ): void {
    if (schema.anyOf) {
      const isValid = schema.anyOf.some((candidate) =>
        this.isSchemaSatisfied(candidate, data, pointer),
      );
      if (!isValid) {
        throw new OpenRouterServiceError(
          `Value at ${pointer} does not match any schema in anyOf.`,
          "VALIDATION_ERROR",
          { detail: data },
        );
      }
      return;
    }

    if (schema.oneOf) {
      const matches = schema.oneOf.filter((candidate) =>
        this.isSchemaSatisfied(candidate, data, pointer),
      );
      if (matches.length !== 1) {
        throw new OpenRouterServiceError(
          `Value at ${pointer} must match exactly one schema in oneOf.`,
          "VALIDATION_ERROR",
          { detail: data },
        );
      }
      return;
    }

    if (schema.allOf) {
      for (const candidate of schema.allOf) {
        this.validateAgainstSchema(candidate, data, pointer);
      }
    }

    if (
      schema.enum &&
      !schema.enum.some((value) => this.deepEqual(value, data))
    ) {
      throw new OpenRouterServiceError(
        `Value at ${pointer} must be one of the allowed enum entries.`,
        "VALIDATION_ERROR",
        { detail: data },
      );
    }

    const expectedTypes = this.normalizeSchemaTypes(schema.type);
    if (expectedTypes.length) {
      const matchesType = expectedTypes.some((typeName) =>
        this.matchesSchemaType(typeName, data),
      );

      if (!matchesType) {
        throw new OpenRouterServiceError(
          `Value at ${pointer} must be of type ${expectedTypes.join(" | ")}.`,
          "VALIDATION_ERROR",
          { detail: data },
        );
      }
    }

    const shouldTreatAsObject =
      schema.properties &&
      (expectedTypes.includes("object") || !expectedTypes.length);
    const shouldTreatAsArray =
      schema.items &&
      (expectedTypes.includes("array") || !expectedTypes.length);

    if (shouldTreatAsObject && this.matchesSchemaType("object", data)) {
      this.validateObject(schema, data, pointer);
      return;
    }

    if (shouldTreatAsArray && Array.isArray(data)) {
      this.validateArray(schema, data, pointer);
      return;
    }

    if (expectedTypes.includes("string") && typeof data === "string") {
      if (
        typeof schema.minLength === "number" &&
        data.length < schema.minLength
      ) {
        throw new OpenRouterServiceError(
          `String at ${pointer} is shorter than minLength ${schema.minLength}.`,
          "VALIDATION_ERROR",
        );
      }
      if (
        typeof schema.maxLength === "number" &&
        data.length > schema.maxLength
      ) {
        throw new OpenRouterServiceError(
          `String at ${pointer} exceeds maxLength ${schema.maxLength}.`,
          "VALIDATION_ERROR",
        );
      }
    }

    if (expectedTypes.includes("number") || expectedTypes.includes("integer")) {
      if (typeof data !== "number" || Number.isNaN(data)) {
        throw new OpenRouterServiceError(
          `Value at ${pointer} must be a valid number.`,
          "VALIDATION_ERROR",
        );
      }
      if (
        expectedTypes.includes("integer") &&
        !Number.isInteger(data as number)
      ) {
        throw new OpenRouterServiceError(
          `Value at ${pointer} must be an integer.`,
          "VALIDATION_ERROR",
        );
      }
    }
  }

  private validateObject(
    schema: JsonSchema,
    data: unknown,
    pointer: string,
  ): void {
    if (!this.matchesSchemaType("object", data)) {
      throw new OpenRouterServiceError(
        `Value at ${pointer} must be an object.`,
        "VALIDATION_ERROR",
      );
    }

    const value = data as Record<string, unknown>;
    const requiredKeys = schema.required ?? [];
    for (const key of requiredKeys) {
      if (!(key in value)) {
        throw new OpenRouterServiceError(
          `Missing required property "${key}" at ${pointer}.`,
          "VALIDATION_ERROR",
        );
      }
    }

    for (const [property, propertySchema] of Object.entries(
      schema.properties ?? {},
    )) {
      if (property in value) {
        this.validateAgainstSchema(
          propertySchema,
          value[property],
          `${pointer}/${property}`,
        );
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
      if (unexpected.length) {
        throw new OpenRouterServiceError(
          `Unexpected properties at ${pointer}: ${unexpected.join(", ")}.`,
          "VALIDATION_ERROR",
        );
      }
    }
  }

  private validateArray(
    schema: JsonSchema,
    data: unknown,
    pointer: string,
  ): void {
    if (!Array.isArray(data)) {
      throw new OpenRouterServiceError(
        `Value at ${pointer} must be an array.`,
        "VALIDATION_ERROR",
      );
    }

    if (typeof schema.minItems === "number" && data.length < schema.minItems) {
      throw new OpenRouterServiceError(
        `Array at ${pointer} must contain at least ${schema.minItems} items.`,
        "VALIDATION_ERROR",
      );
    }

    if (typeof schema.maxItems === "number" && data.length > schema.maxItems) {
      throw new OpenRouterServiceError(
        `Array at ${pointer} must contain at most ${schema.maxItems} items.`,
        "VALIDATION_ERROR",
      );
    }

    if (Array.isArray(schema.items)) {
      schema.items.forEach((itemSchema, index) => {
        this.validateAgainstSchema(
          itemSchema,
          data[index],
          `${pointer}/${index}`,
        );
      });
      return;
    }

    if (schema.items && !Array.isArray(schema.items)) {
      data.forEach((entry, index) => {
        this.validateAgainstSchema(
          schema.items as JsonSchema,
          entry,
          `${pointer}/${index}`,
        );
      });
    }
  }

  private shouldRetry(status: number): boolean {
    return status === 0 || RETRIABLE_STATUS_CODES.has(status) || status >= 500;
  }

  private async delayForAttempt(attempt: number): Promise<void> {
    const delay =
      this.retryDelayMs * Math.pow(this.backoffMultiplier, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private extractErrorMessage(body: unknown): string | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }

    const errorBody = body as OpenRouterErrorResponse;
    if (typeof errorBody.message === "string") {
      return errorBody.message;
    }

    if (typeof errorBody.error === "string") {
      return errorBody.error;
    }

    if (
      errorBody.error &&
      typeof errorBody.error === "object" &&
      typeof errorBody.error.message === "string"
    ) {
      return errorBody.error.message;
    }

    return undefined;
  }

  private normalizeResponse(body: unknown): OpenRouterApiResponse {
    if (
      !body ||
      typeof body !== "object" ||
      !("id" in body) ||
      !("choices" in body)
    ) {
      throw new OpenRouterServiceError(
        "Unexpected OpenRouter response shape.",
        "API_ERROR",
        { detail: body },
      );
    }

    return body as OpenRouterApiResponse;
  }

  private matchesSchemaType(
    typeName: JsonSchemaTypeName,
    value: unknown,
  ): boolean {
    switch (typeName) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && Number.isFinite(value);
      case "integer":
        return typeof value === "number" && Number.isInteger(value);
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      case "array":
        return Array.isArray(value);
      case "null":
        return value === null;
      default:
        return false;
    }
  }

  private normalizeSchemaTypes(
    typeField: JsonSchema["type"],
  ): JsonSchemaTypeName[] {
    if (!typeField) {
      return [];
    }
    if (Array.isArray(typeField)) {
      return typeField.filter(
        (entry): entry is JsonSchemaTypeName => typeof entry === "string",
      );
    }
    return [typeField];
  }

  private isSchemaSatisfied(
    schema: JsonSchema,
    data: unknown,
    pointer: string,
  ): boolean {
    try {
      this.validateAgainstSchema(schema, data, pointer);
      return true;
    } catch {
      return false;
    }
  }

  private deepEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
      return true;
    }

    if (
      typeof left !== typeof right ||
      typeof left !== "object" ||
      left === null ||
      right === null
    ) {
      return false;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }
      return left.every((value, index) => this.deepEqual(value, right[index]));
    }

    if (Array.isArray(left) || Array.isArray(right)) {
      return false;
    }

    const leftEntries = Object.entries(left as Record<string, unknown>);
    const rightEntries = Object.entries(right as Record<string, unknown>);

    if (leftEntries.length !== rightEntries.length) {
      return false;
    }

    return leftEntries.every(([key, value]) =>
      this.deepEqual(value, (right as Record<string, unknown>)[key]),
    );
  }

  private ensureNonEmptyMessage(value: string, fieldLabel: string): string {
    if (typeof value !== "string") {
      throw new OpenRouterServiceError(
        `${fieldLabel} must be a string.`,
        "VALIDATION_ERROR",
      );
    }

    const trimmed = value.trim();
    if (!trimmed.length) {
      throw new OpenRouterServiceError(
        `${fieldLabel} cannot be empty.`,
        "VALIDATION_ERROR",
      );
    }

    return trimmed;
  }

  private logWarn(message: string, detail?: unknown): void {
    if (!this.logger?.warn) {
      return;
    }
    this.logger.warn(`[OpenRouterService] ${message}`, detail ?? "");
  }

  private logInfo(message: string, detail?: unknown): void {
    if (!this.logger?.info) {
      return;
    }
    this.logger.info(`[OpenRouterService] ${message}`, detail ?? "");
  }

  private logError(message: string, detail?: unknown): void {
    if (!this.logger?.error) {
      return;
    }
    this.logger.error(`[OpenRouterService] ${message}`, detail ?? "");
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  private isFetchError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const name = error.name?.toLowerCase?.() ?? "";
    const message = error.message?.toLowerCase?.() ?? "";

    return (
      name.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("network")
    );
  }

  private generateSchemaName(): string {
    this.schemaCounter += 1;
    return `structured_output_${this.schemaCounter}`;
  }

  private assertApiKey(): void {
    if (!this.apiKey) {
      throw new OpenRouterServiceError(
        "OpenRouter API key is missing. Provide it via constructor or OPENROUTER_API_KEY.",
        "CONFIGURATION_ERROR",
      );
    }
  }
}
