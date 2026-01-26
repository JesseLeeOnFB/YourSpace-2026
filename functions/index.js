// ===============================
// YourSpace Firebase Functions (GEN 2)
// Node 20 / Firebase Functions v2
// ===============================

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import Stripe from "stripe";

import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

initializeApp();
const db = getFirestore();
const auth = getAuth();

// 🔐 Secrets
const stripeKey = defineSecret("STRIPE_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// ===============================
// STRIPE WEBHOOK (GEN 2)
// ===============================
export const stripeWebhook = onRequest(
  { secrets: [stripeKey, webhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const stripe = new Stripe(stripeKey.value(), {
      apiVersion: "2024-06-20",
    });

    let event;
    try {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret.value()
      );
    } catch (err) {
      console.error("❌ Stripe signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("✅ Stripe event:", event.type);

    // ===============================
    // PAYMENT SUCCESS
    // ===============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      try {
        const pendingSnap = await db.collection("pendingGifts")
          .where("status", "==", "pending")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (pendingSnap.empty) {
          console.log("⚠️ No pending gift found");
          return res.json({ received: true });
        }

        const giftDoc = pendingSnap.docs[0];
        const giftData = giftDoc.data();

        await giftDoc.ref.update({
          status: "completed",
          stripeSessionId: session.id,
          completedAt: Timestamp.now(),
        });

        await db.collection("gifts").add({
          ...giftData,
          status: "delivered",
          stripeSessionId: session.id,
          deliveredAt: Timestamp.now(),
        });

        const fullAmount = session.amount_total;
        const giftType = giftData.giftType.toLowerCase();

        let percent = 0.20;
        if (giftType === "diamond" || giftType === "yacht") percent = 0.40;

        const credit = Math.floor(fullAmount * percent);

        await db.collection("users").doc(giftData.recipientId).update({
          payoutBalance: FieldValue.increment(credit),
          totalGiftsReceived: FieldValue.increment(1),
          [`giftsReceived.${giftType}`]: FieldValue.increment(1),
        });

        await db.collection("users").doc(giftData.senderId).update({
          totalGiftsSent: FieldValue.increment(1),
          [`giftsSent.${giftType}`]: FieldValue.increment(1),
        });

        await db.collection("notifications").add({
          userId: giftData.recipientId,
          type: "gift_received",
          message: `${giftData.senderName} sent you a ${giftType}! 🎁`,
          createdAt: Timestamp.now(),
          read: false,
        });

        console.log("🎁 Gift processed successfully");
      } catch (err) {
        console.error("🔥 Gift processing error:", err);
        return res.status(500).send("Server error");
      }
    }

    res.json({ received: true });
  }
);

// ===============================
// CALLABLES
// ===============================
export const sendGift = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");

  const { recipientId, giftId } = req.data;
  if (!recipientId || !giftId)
    throw new HttpsError("invalid-argument", "Missing fields");

  return { success: true };
});

export const updateProfile = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");

  const { displayName, photoURL } = req.data;

  await auth.updateUser(req.auth.uid, { displayName, photoURL });
  return { success: true };
});
