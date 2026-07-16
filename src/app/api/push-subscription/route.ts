import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { participantId, subscription } = await req.json();

    if (!participantId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys || {};

    if (!p256dh || !auth) {
      return NextResponse.json({ error: "Missing subscription keys" }, { status: 400 });
    }

    // Upsert subscription
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          participant_id: participantId,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: "endpoint" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("API error push-subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) {
      console.error("Error deleting push subscription:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("API error delete push-subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
