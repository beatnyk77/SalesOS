/**
 * lib/llm/client.ts
 *
 * Shared LLM client utility for Next.js server context.
 * Provides a simple chatCompletion helper using OpenAI directly via REST
 * to avoid heavy SDK dependencies or Python ports when not strictly needed.
 */

export interface ChatCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

export async function chatCompletion({
  prompt,
  systemPrompt = "You are a helpful assistant.",
  model = "gpt-4o",
  temperature = 0.7,
}: ChatCompletionOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY not found in environment. Using fallback mock response.");
    return `[Mock Response] Would have called ${model} with prompt: ${prompt.substring(0, 50)}...`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error (${response.status}): ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("LLM Client Error:", error);
    throw error;
  }
}
