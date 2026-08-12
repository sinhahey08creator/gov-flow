import { getGeminiClient } from "./client";

export interface BottleneckFacts {
  case_id: string;
  department: string;
  officer: string;
  current_load: number;
  queue_length: number;
  avg_processing_days: number;
  sla_risk: number;
  priority: string;
}

const DEMO_EXPLANATION = (f: BottleneckFacts) =>
  `${f.department} verification is currently the main bottleneck because ${f.officer} has ${f.current_load} pending cases while the ${f.department} queue contains ${f.queue_length} files. Since this is a ${f.priority}-priority case and the calculated SLA risk is ${f.sla_risk}%, the case is likely to experience delay. An alternative eligible officer with lower workload should be considered.`;

export async function explainBottleneck(
  facts: BottleneckFacts
): Promise<{ explanation: string; source: "gemini" | "demo_fallback" }> {
  const gemini = getGeminiClient();
  if (!gemini) return { explanation: DEMO_EXPLANATION(facts), source: "demo_fallback" };

  try {
    const model = gemini.getGenerativeModel({ model: "gemini-3.5-flash"  });
    const prompt = `Explain this government workflow bottleneck in simple language for a government officer. Do NOT calculate or invent any numbers — use only the supplied facts. Explain the causal chain and recommend an intervention in 2-3 sentences.\n\nFacts:\n${JSON.stringify(facts, null, 2)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) return { explanation: DEMO_EXPLANATION(facts), source: "demo_fallback" };
    return { explanation: text, source: "gemini" };
  } catch (err) {
    console.error("Gemini explanation error, using demo fallback:", err);
    return { explanation: DEMO_EXPLANATION(facts), source: "demo_fallback" };
  }
}
