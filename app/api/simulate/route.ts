import { NextRequest, NextResponse } from "next/server";
import { simulateOfficerUnavailable } from "@/lib/calculations/whatIf";
import { DEMO_CASE, DEMO_FINANCE_QUEUE_LENGTH } from "@/lib/demo/seedData";
import { getOfficers } from "@/lib/supabase/data";
import { WorkflowStep } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { currentOfficerId: string; step: WorkflowStep };
    const step: WorkflowStep = {
      ...body.step,
      queue_length: body.step.queue_length ?? DEMO_FINANCE_QUEUE_LENGTH,
    };

    const { officers, source } = await getOfficers();
    const result = simulateOfficerUnavailable({
      currentOfficerId: body.currentOfficerId,
      officers,
      step,
      caseData: DEMO_CASE,
    });

    return NextResponse.json({ ...result, source });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
