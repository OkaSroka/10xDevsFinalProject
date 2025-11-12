# REST API Plan

## 1. Resources

- **Users**

  - _Database Table_: `users`
  - Managed through Supabase Auth; operations such as registration and login may be handled via Supabase or custom endpoints if needed.

- **Flashcards**

  - _Database Table_: `flashcards`
  - Fields include: `id`, `front`, `back`, `source`, `created_at`, `updated_at`, `generation_id`, `user_id`.

- **Generations**

  - _Database Table_: `generations`
  - Stores metadata and results of AI generation requests (e.g., `model`, `generated_count`, `source_text_hash`, `source_text_length`, `generation_duration`).

- **Generation Error Logs**
  - _Database Table_: `generation_error_logs`
  - Used for logging errors encountered during AI flashcard generation.

## 2. Endpoints

### 2.2. Flashcards

- **GET `/flashcards`**

  - **Description**: Retrieve a paginated, filtered, and sortable list of flashcards for the authenticated user.
  - **Query Parameters**:
    - `page` (default: 1)
    - `limit` (default: 10)
    - `sort` (e.g., `created_at`)
    - `order` (`asc` or `desc`)
    - Optional filters (e.g., `source`, `generation_id`).
  - **Response JSON**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "front": "Question",
          "back": "Answer",
          "source": "manual",
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 100 }
    }
    ```
  - **Errors**: 401 Unauthorized if token is invalid.

- **GET `/flashcards/{id}`**

  - **Description**: Retrieve details for a specific flashcard.
  - **Response JSON**: Flashcard object.
  - **Errors**: 404 Not Found, 401 Unauthorized.

- **POST `/flashcards`**

  - **Description**: Create one or more flashcards (manually or from AI generation).
  - **Limits**: Up to 50 flashcards can be submitted per request; batches beyond this size are rejected with `400 Bad Request`.
  - **Request JSON**:
    ```json
    {
      "flashcards": [
        {
          "front": "Question 1",
          "back": "Answer 1",
          "source": "manual",
          "generation_id": null
        },
        {
          "front": "Question 2",
          "back": "Answer 2",
          "source": "ai-full",
          "generation_id": 123
        }
      ]
    }
    ```
  - **Response JSON**:
    ```json
    {
      "flashcards": [
        {
          "id": 1,
          "front": "Question 1",
          "back": "Answer 1",
          "source": "manual",
          "generation_id": null
        },
        {
          "id": 2,
          "front": "Question 2",
          "back": "Answer 2",
          "source": "ai-full",
          "generation_id": 123
        }
      ]
    }
    ```
  - **Validations**:
    - `front` maximum length: 200 characters.
    - `back` maximum length: 500 characters.
    - `source`: Must be one of `ai-full`, `ai-edited`, or `manual`.
    - `generation_id`: Required for `ai-full` and `ai-edited` sources, must be null for `manual` source.
    - Each flashcard is trimmed server-side; empty strings after trimming remain invalid.
  - **Errors**: 400 for invalid inputs, including validation errors for any flashcard in the array.
    - Validation responses include a `details` array describing per-field issues.
    - When referenced `generation_id` values do not belong to the caller, the API responds with `400` and includes the missing IDs in `details`.
  - **Recommended automated tests**:
    - Happy path with mixed manual and AI flashcards linked to the caller’s generation.
    - Batch rejection when `flashcards.length > 50`.
    - Payload trimming/empty strings to ensure validation catches whitespace-only fronts/backs.
    - Ownership enforcement when `generation_id` points to another user.
    - Auth failure scenarios (missing/expired Supabase token).

- **PUT `/flashcards/{id}`**

  - **Description**: Edit an existing flashcard.
  - **Request JSON**: Fields to update.
  - **Response JSON**: Updated flashcard object.
  - **Errors**: 400 for invalid input, 404 if flashcard not found, 401 Unauthorized.

- **DELETE `/flashcards/{id}`**
  - **Description**: Delete a flashcard.
  - **Response JSON**: Success message.
  - **Errors**: 404 if flashcard not found, 401 Unauthorized.

### 2.3. Generations

- **POST `/generations`**

  - **Description**: Initiate the AI generation process for flashcards proposals based on user-provided text.
  - **Request JSON** (_Zod schema defined in `src/pages/api/generations.ts`_):
    ```json
    {
      "source_text": "User provided text (1000 to 10000 characters)"
    }
    ```
  - **Business Logic**:
    - Validate that `source_text` length is between 1000 and 10000 characters (see `GenerationCreateCommand` in `src/types.ts`).
    - Call the AI service (currently `GenerationService.mockAiGeneration`) to generate flashcards proposals.
    - Store generation metadata (`model`, `generated_count`, `generation_duration`, `source_text_hash`, `source_text_length`, timestamps) and return proposals to the user.
  - **Response JSON** (_matches `CreateGenerationResponseDto`_):
    ```json
    {
      "generation_id": 123,
      "flashcards_proposals": [
        {
          "front": "Generated Question",
          "back": "Generated Answer",
          "source": "ai-full"
        }
      ],
      "generated_count": 5
    }
    ```
  - **Status Codes**:
    - `201 Created` on success.
    - `400 Bad Request` for invalid payloads (malformed JSON, missing `source_text`, length outside range).
    - `401 Unauthorized` when Supabase Auth validation fails (once enabled).
    - `500 Internal Server Error` when AI or DB persistence fails. Every AI failure must be logged into `generation_error_logs`.

- **GET `/generations`**

  - **Description**: Retrieve all generation runs that belong to the authenticated user, ordered by `created_at` descending by default.
  - **Query Parameters**:
    - `page` (default `1`) and `limit` (default `10`, max `50`) for pagination.
    - `model` (optional) to filter by AI model string.
    - `min_generated_count` / `max_generated_count` (optional) to filter by proposal volume.
    - `source_text_hash` (optional) to inspect a specific source submission.
    - `sort` (default `created_at`) and `order` (`asc` or `desc`).
  - **Response JSON** (_array of `GenerationSummaryDto` objects; user-owned fields only_):
    ```json
    {
      "data": [
        {
          "id": 123,
          "model": "openrouter/anthropic/claude-3.5-sonnet",
          "generated_count": 5,
          "generation_duration": 1875,
          "source_text_hash": "a4d12e...",
          "source_text_length": 2048,
          "accepted_unedited_count": 3,
          "accepted_edited_count": 1,
          "created_at": "2025-11-12T20:21:00.000Z",
          "updated_at": "2025-11-12T20:21:00.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 27 }
    }
    ```
  - **Errors**:
    - `401 Unauthorized` if the bearer token is missing/invalid.
    - `400 Bad Request` for invalid pagination arguments.

- **GET `/generations/{id}`**
  - **Description**: Retrieve one generation plus all flashcards linked through `generation_id`. Combines `GenerationSummaryDto` with an array of `FlashcardDetailDto`.
  - **Response JSON**:
    ```json
    {
      "generation": {
        "id": 123,
        "model": "openrouter/anthropic/claude-3.5-sonnet",
        "generated_count": 5,
        "generation_duration": 1875,
        "source_text_hash": "a4d12e...",
        "source_text_length": 2048,
        "accepted_unedited_count": 3,
        "accepted_edited_count": 1,
        "created_at": "2025-11-12T20:21:00.000Z",
        "updated_at": "2025-11-12T20:21:00.000Z"
      },
      "flashcards": [
        {
          "id": 1,
          "front": "Question",
          "back": "Answer",
          "source": "ai-full",
          "generation_id": 123,
          "created_at": "2025-11-12T20:21:05.000Z",
          "updated_at": "2025-11-12T20:21:05.000Z"
        }
      ]
    }
    ```
  - **Errors**:
    - `401 Unauthorized` if the caller is not authenticated.
    - `404 Not Found` when the generation either does not exist or belongs to another user (protected via RLS).

### 2.4. Generation Error Logs

_(Typically used internally or by admin users)_

- **GET `/generation-error-logs`**
  - **Description**: Retrieve error logs for AI flashcard generation for the authenticated user or admin. Values come directly from `generation_error_logs` table; `user_id` is stripped in API responses (`GenerationErrorLogDto`).
  - **Query Parameters**:
    - `page` / `limit` for pagination (defaults mirror `/generations`).
    - `model`, `error_code`, `source_text_hash`, or `date_from` / `date_to` for filtering investigations.
    - `order` (`asc` / `desc`, default `desc`) applied to `created_at`.
  - **Response JSON**:
    ```json
    {
      "data": [
        {
          "id": 999,
          "error_code": "AI_REQUEST_FAILED",
          "error_message": "Anthropic timeout",
          "model": "openrouter/anthropic/claude-3.5-sonnet",
          "source_text_hash": "a4d12e...",
          "source_text_length": 2048,
          "created_at": "2025-11-12T20:21:02.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 4 }
    }
    ```
  - **Errors**:
    - `401 Unauthorized` if token is invalid.
    - `403 Forbidden` when endpoint is limited to admins/support staff.
    - `400 Bad Request` for invalid filters (e.g., `date_from` after `date_to`).

## 3. Authentication and Authorization

- **Mechanism**: Token-based authentication using Supabase Auth.
- **Process**:
  - Users authenticate via `/auth/login` or `/auth/register`, receiving a bearer token.
  - Protected endpoints require the token in the `Authorization` header.
  - Database-level Row-Level Security (RLS) ensures that users access only records with matching `user_id`.
- **Additional Considerations**: Use HTTPS, rate limiting, and secure error messaging to mitigate security risks.

## 4. Validation and Business Logic

- **Validation Rules**:

  - **Flashcards**:
    - `front`: Maximum length of 200 characters.
    - `back`: Maximum length of 500 characters.
    - `source`: Must be one of `ai-full`, `ai-edited`, or `manual`.
  - **Generations**:
    - `source_text`: Must have a length between 1000 and 10000 characters.
    - `source_text_hash`: Computed for duplicate detection.

- **Business Logic Implementation**:
  - **AI Generation**:
    - Validate inputs and call the AI service upon POST `/generations`.
    - Record generation metadata (model, generated_count, duration) and send generated flashcards proposals to the user.
    - Log any errors in `generation_error_logs` for auditing and debugging.
  - **Flashcard Management**:
    - Automatic update of the `updated_at` field via database triggers when flashcards are modified.
