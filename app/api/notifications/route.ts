import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type NotificationRequest = {
  case_id: string;
  document_type: string;
  channel: "email" | "sms";
  recipient: string;
  message: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<NotificationRequest>;

    const {
      case_id,
      document_type,
      channel,
      recipient,
      message,
    } = body;

    if (!case_id || !document_type || !channel || !recipient || !message) {
      return NextResponse.json(
        { error: "Missing required notification fields." },
        { status: 400 }
      );
    }

    if (channel !== "email" && channel !== "sms") {
      return NextResponse.json(
        { error: "Notification channel must be email or sms." },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    // First create the notification as pending.
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        case_id,
        document_type,
        channel,
        recipient,
        message,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to create notification:", error);

      return NextResponse.json(
        { error: "Could not create notification." },
        { status: 500 }
      );
    }

    /*
     * DEMO MODE:
     * We are not connected to a real email/SMS provider yet.
     *
     * For now, we mark the notification as sent so the complete
     * backend flow can be tested. Later this section will call
     * the actual email/SMS provider and only mark it "sent" when
     * the provider confirms delivery.
     */
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_id: `demo-${data.id}`,
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("Failed to update notification status:", updateError);

      return NextResponse.json(
        {
          error: "Notification was created but its status could not be updated.",
          notification_id: data.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification_id: data.id,
      status: "sent",
      channel,
      recipient,
      demo: true,
    });
  } catch (err) {
    console.error("Notification API error:", err);

    return NextResponse.json(
      { error: "We couldn't process the notification request." },
      { status: 500 }
    );
  }
}