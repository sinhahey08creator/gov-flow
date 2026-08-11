import { NextRequest, NextResponse } from "next/server";
import { recommendOfficer } from "@/lib/calculations/officerScore";
import { getOfficers } from "@/lib/supabase/data";
import { WorkflowStep } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { step: WorkflowStep; excludeOfficerId?: string };
    if (!body.step) {
      return NextResponse.json({ error: "Missing workflow step" }, { status: 400 });
    }
    const { officers, source } = await getOfficers();
    const recommendation = recommendOfficer(officers, body.step, body.excludeOfficerId);
    if (!recommendation) {
      return NextResponse.json({ error: "No eligible officer found" }, { status: 404 });
    }
    return NextResponse.json({ ...recommendation, source });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Recommendation failed" }, { status: 500 });
  }
}
