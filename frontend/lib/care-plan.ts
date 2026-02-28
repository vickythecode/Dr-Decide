type ParsedCarePlanJson = {
  care_plan?: Record<string, string>;
  summarization?: string[];
};

export type CarePlanView = {
  planLines: string[];
  summaryLines: string[];
  rawText: string;
};

function safeParseJson(raw: string): ParsedCarePlanJson | null {
  try {
    const parsed = JSON.parse(raw) as ParsedCarePlanJson;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCarePlanText(raw: string): CarePlanView {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { planLines: [], summaryLines: [], rawText: "" };
  }

  const parsed = safeParseJson(trimmed);
  if (parsed) {
    const planLines = Object.entries(parsed.care_plan || {})
      .map(([slot, text]) => `${slot}: ${text}`)
      .filter(Boolean);
    const summaryLines = (parsed.summarization || []).filter(Boolean);
    const fallbackRaw = JSON.stringify(parsed, null, 2);
    return {
      planLines,
      summaryLines,
      rawText: planLines.length || summaryLines.length ? "" : fallbackRaw,
    };
  }

  const plainLines = trimmed
    .split("\n")
    .map((line) => line.replace(/^[\-\d\.\)\s]+/, "").trim())
    .filter(Boolean);
  return { planLines: plainLines, summaryLines: [], rawText: "" };
}

