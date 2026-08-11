import { NextRequest, NextResponse } from "next/server";
import { explainBottleneck, BottleneckFacts } from "@/lib/gemini/explainBottleneck";

export async function POST(req: NextRequest) {
  try {
    const facts = (await req.json()) as BottleneckFacts;
    const result = await explainBottleneck(facts);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Explanation failed" }, { status: 500 });
  }
}
