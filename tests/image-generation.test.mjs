import assert from "node:assert/strict";
import { createIllustrationPrompt, generateIllustration, ImageGenerationError } from "../lib/image-generation.js";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const pngBase64 = "iVBORw0KGgo=";
let request;
const image = await generateIllustration({
  apiKey: "test-key",
  style: "pink rabbits",
  fetchImpl: async (url, options) => {
    request = { url, options };
    return response(200, { data: [{ b64_json: pngBase64 }] });
  },
});
assert.equal(image, `data:image/png;base64,${pngBase64}`);
assert.equal(request.url, "https://api.openai.com/v1/images/generations");
assert.equal(request.options.headers.Authorization, "Bearer test-key");
const payload = JSON.parse(request.options.body);
assert.equal(payload.output_format, "png");
assert.match(payload.prompt, /pink rabbits/);
assert.match(payload.prompt, /Absolutely no text/);

assert.throws(() => createIllustrationPrompt("x".repeat(161)), error => error instanceof ImageGenerationError && error.status === 400);
await assert.rejects(() => generateIllustration({ apiKey: "" }), error => error instanceof ImageGenerationError && error.status === 503);
await assert.rejects(
  () => generateIllustration({ apiKey: "test-key", fetchImpl: async () => response(429, { error: { code: "rate_limit_exceeded" } }) }),
  error => error instanceof ImageGenerationError && error.status === 429,
);
await assert.rejects(
  () => generateIllustration({ apiKey: "test-key", fetchImpl: async () => response(400, { error: { code: "credit_balance_exhausted" } }) }),
  error => error instanceof ImageGenerationError && error.status === 503,
);
await assert.rejects(
  () => generateIllustration({ apiKey: "test-key", fetchImpl: async () => response(200, { data: [] }) }),
  error => error instanceof ImageGenerationError && error.status === 502,
);
await assert.rejects(
  () => generateIllustration({ apiKey: "test-key", fetchImpl: async () => { throw new Error("offline"); } }),
  error => error instanceof ImageGenerationError && error.status === 502,
);
