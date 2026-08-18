import { NextRequest, NextResponse } from "next/server";
import { assignOfficerToStep } from "@/lib/supabase/cases";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const body = await req.json().catch(() => null);

  const stepId = body?.stepId as string | undefined;
  const officerId = body?.officerId as string | undefined;

  if (!stepId || !officerId) {
    return NextResponse.json(
      { error: "stepId and officerId are both required." },
      { status: 400 }
    );
  }

  const result = await assignOfficerToStep(stepId, officerId);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Assignment failed." }, { status: 500 });
  }

  return NextResponse.json({ success: true, caseId, stepId, officerId });
}
