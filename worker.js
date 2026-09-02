const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const ALLOWED_ORIGIN = "https://vrachuemail-droid.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname !== "/api/marrow" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY is not configured on the Worker." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    const system = String(body.system || "").slice(0, 18000);
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];

    if (!messages.length) {
      return json({ error: "No conversation supplied." }, 400);
    }

    const contents = messages
      .map(m => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.parts?.[0]?.text || "").slice(0, 14000) }]
      }))
      .filter(m => m.parts[0].text.trim());

    if (!contents.length || contents[0].role !== "user") {
      return json({ error: "Conversation must begin with a user message." }, 400);
    }

    let lastError = "Gemini did not return a response.";

    for (const model of MODELS) {
      let timer;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              generationConfig: {
                maxOutputTokens: Math.min(Number(body.maxOutputTokens) || 450, 700),
                thinkingConfig: { thinkingLevel: "minimal" }
              }
            }),
            signal: controller.signal
          }
        );

        const data = await response.json().catch(() => null);

        if (response.ok) {
          const text = data?.candidates?.[0]?.content?.parts
            ?.map(p => p.text || "").join("").trim();

          if (text) return json({ text, model });
          lastError = `${model} returned an empty response.`;
        } else {
          lastError = data?.error?.message || `Gemini returned HTTP ${response.status}.`;
          if (![429, 500, 502, 503, 504].includes(response.status)) break;
        }
      } catch (e) {
        lastError = e?.name === "AbortError"
          ? `${model} timed out.`
          : (e?.message || "Network error contacting Gemini.");
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    return json({ error: lastError }, 502);
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}
