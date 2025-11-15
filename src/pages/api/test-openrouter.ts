import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtimeEnv = locals.runtime?.env;

  console.error("[test-openrouter] Starting test");
  console.error("[test-openrouter] Has runtime env:", !!runtimeEnv);
  console.error(
    "[test-openrouter] Has OPENROUTER_API_KEY:",
    !!runtimeEnv?.OPENROUTER_API_KEY,
  );

  const apiKey =
    runtimeEnv?.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "No API key" }, { status: 500 });
  }

  try {
    console.error("[test-openrouter] Making request to OpenRouter...");

    const startTime = Date.now();
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages: [
            { role: "user", content: "Say 'test successful' in 3 words" },
          ],
          max_tokens: 20,
        }),
      },
    );

    const duration = Date.now() - startTime;
    console.error(`[test-openrouter] Request completed in ${duration}ms`);
    console.error("[test-openrouter] Status:", response.status);

    const data = await response.json();
    console.error("[test-openrouter] Response received");

    return Response.json({
      success: true,
      duration_ms: duration,
      status: response.status,
      response: data,
    });
  } catch (error) {
    console.error("[test-openrouter] Error:", error);
    return Response.json(
      {
        error: "Request failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
