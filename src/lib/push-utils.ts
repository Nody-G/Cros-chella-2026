export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error("Error getting push subscription:", err);
    return null;
  }
}

export async function subscribeToPush(participantId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== "granted") {
      if (permission === "denied") {
        alert("Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.");
      }
      return false;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BAYlSx2VGmwAji5M4_FZAryjFV1flBD9o4Onclkfk8O6KpyaRYE3Zc82RgfnJY6smByNditRu2KAMCxjbKTHp4I";
    if (!publicKey) {
      console.error("VAPID public key is missing.");
      return false;
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const res = await fetch("/api/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        subscription,
      }),
    });

    return res.ok;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error subscribing to push notifications:", error);
    alert("Erreur lors de l'abonnement : " + (error.message || String(error)));
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // 1. Delete on server
      try {
        await fetch("/api/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      } catch (e) {
        console.error("Failed to delete subscription on server:", e);
      }

      // 2. Unsubscribe locally
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error unsubscribing from push notifications:", err);
    return false;
  }
}
