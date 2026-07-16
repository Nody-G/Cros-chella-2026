import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Set VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:niels@moulinducros.com",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("VAPID keys are missing from environment variables.");
}

export async function POST(req: NextRequest) {
  try {
    const bodyJson = await req.json();
    const { authorId, text, imageUrl } = bodyJson;
    let { title, body, url } = bodyJson;

    if (!authorId) {
      return NextResponse.json({ error: "Missing authorId" }, { status: 400 });
    }

    // 1. Get author and format notification details if body is not present
    if (!body && text) {
      const { data: author } = await supabase
        .from("participants")
        .select("name, pseudo")
        .eq("id", authorId)
        .single();

      const senderName = author ? (author.pseudo || author.name) : "Quelqu'un";
      title = title || "Cros-Chella 🎪";
      url = url || "/chat";
      
      if (imageUrl && !text) {
        body = `${senderName} a envoyé une photo 📷`;
      } else if (imageUrl && text) {
        body = `${senderName}: ${text} 📷`;
      } else {
        body = `${senderName}: ${text || ""}`;
      }
    }

    const notificationTitle = title || "Cros-Chella 🎪";
    const notificationBody = body || "";
    const targetUrl = url || "/chat";

    // 2. Fetch all subscriptions EXCEPT the author's own subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .neq("participant_id", authorId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      url: targetUrl,
      icon: "/logo.png",
      badge: "/logo.png",
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        // If subscription is expired or invalid (404, 410), delete it from the DB
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Deleting expired subscription endpoint: ${sub.endpoint}`);
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        } else {
          console.error(`Error sending push notification to endpoint ${sub.endpoint}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, notifiedCount: subscriptions.length });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("API error push-notify:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
