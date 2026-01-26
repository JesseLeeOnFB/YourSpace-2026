// ===============================
// YourSpace Firebase Functions
// Fully modernized, Node 20 / Functions v4 compatible
// Supports Firebase Secrets and gift logic
// ===============================

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as functions from "firebase-functions/v1"; // Required for runWith + v1 syntax compatibility
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

// ===============================
// Initialize Firebase Admin SDK
// ===============================
initializeApp({
  credential: applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS or Firebase Secret
});
const db = getFirestore();
const auth = getAuth();

// ===============================
// Define Secrets (Firebase Secret Manager)
// Set with:
//   firebase functions:secrets:set STRIPE_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
// ===============================
const stripeKey = defineSecret("STRIPE_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// ===============================
// Gift logic helper functions
// ===============================
async function giveGiftToUser(userId, giftId) {
  const userRef = db.collection("users").doc(userId);
  const giftRef = db.collection("gifts").doc(giftId);
  // Validate gift exists
  const giftSnap = await giftRef.get();
  if (!giftSnap.exists) throw new Error("Gift not found");
  // Add gift to user
  await userRef.update({
    gifts: FieldValue.arrayUnion({
      id: giftId,
      receivedAt: Timestamp.now(),
    }),
  });
  return { success: true, gift: giftSnap.data() };
}

// ===============================
// Stripe Webhook Handler (with secrets binding)
// ===============================
export const stripeWebhook = functions
  .runWith({
    secrets: ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET"],
  })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      console.log(`Invalid method: ${req.method}`);
      return res.status(405).send("Method Not Allowed");
    }
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      // Use secrets from Secret Manager (process.env in runtime)
      let endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      // === TEMPORARY FOR LOCAL EMULATOR TESTING ===
      // Replace with the secret printed by `stripe listen`
      // Remove or comment out this block before deploying to production
      if (process.env.FUNCTIONS_EMULATOR === "true") {
        endpointSecret = "whsec_YH6q46Ac0aJiYP5VXnb9VpwD0Z5J116e"; // ← PASTE THE SECRET FROM `stripe listen` HERE
        console.log("[LOCAL] Using emulator webhook secret for signature verification");
      }
      // === END LOCAL OVERRIDE ===
      if (!endpointSecret) {
        throw new Error("Webhook secret not configured in Firebase secrets");
      }
      // Initialize Stripe inside handler (uses secret)
      const stripe = new Stripe(process.env.STRIPE_KEY || "", {
        apiVersion: "2024-06-20", // Latest stable version – update as needed
      });
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // Idempotency check - prevent duplicate processing
      const existingGift = await db.collection("gifts")
        .where("stripeSessionId", "==", session.id)
        .limit(1)
        .get();
      if (!existingGift.empty) {
        console.log(`Already processed session ${session.id} - skipping`);
        return res.json({ received: true });
      }
      console.log("Processing checkout.session.completed:", session.id);
      try {
        // Find the most recent pending gift (within last 10 minutes)
        const tenMinutesAgo = Timestamp.fromDate(
          new Date(Date.now() - 10 * 60 * 1000)
        );
        const pendingGiftsSnapshot = await db.collection("pendingGifts")
          .where("status", "==", "pending")
          .where("createdAt", ">=", tenMinutesAgo)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();
        if (pendingGiftsSnapshot.empty) {
          console.log("No matching pending gift found for session:", session.id);
          return res.json({ received: true, warning: "No pending gift found" });
        }
        const giftDoc = pendingGiftsSnapshot.docs[0];
        const giftData = giftDoc.data();
        // Update pending gift status
        await giftDoc.ref.update({
          status: "completed",
          stripeSessionId: session.id,
          completedAt: Timestamp.now(),
        });
        // Create completed gift record
        await db.collection("gifts").add({
          senderId: giftData.senderId,
          senderName: giftData.senderName,
          recipientId: giftData.recipientId,
          recipientName: giftData.recipientName,
          postId: giftData.postId,
          giftType: giftData.giftType,
          status: "delivered",
          stripeSessionId: session.id,
          createdAt: giftData.createdAt,
          deliveredAt: Timestamp.now(),
        });
        // ────────────────────────────────────────────────
        // REVENUE SPLIT & PAYOUT BALANCE CREDIT LOGIC
        // ────────────────────────────────────────────────
        const fullAmountCents = session.amount_total; // Full price paid (in cents)
        const giftType = giftData.giftType.toLowerCase();
        // Platform keeps 60%
        const platformKeepCents = Math.floor(fullAmountCents * 0.60);
        // Recipient gets 20% for lower tiers, 40% for diamond/yacht
        let recipientPercentage = 0.20; // Default for coffee, rose, teddybear, cake
        if (giftType === "diamond" || giftType === "yacht") {
          recipientPercentage = 0.40;
        }
        const recipientCreditCents = Math.floor(fullAmountCents * recipientPercentage);
        // Credit recipient's payout balance (in cents)
        const recipientRef = db.collection("users").doc(giftData.recipientId);
        await recipientRef.update({
          payoutBalance: FieldValue.increment(recipientCreditCents),
          [`giftsReceived.${giftData.giftType}`]: FieldValue.increment(1),
          totalGiftsReceived: FieldValue.increment(1),
        });
        // Update sender counts (no balance change for sender)
        const senderRef = db.collection("users").doc(giftData.senderId);
        await senderRef.update({
          [`giftsSent.${giftData.giftType}`]: FieldValue.increment(1),
          totalGiftsSent: FieldValue.increment(1),
        });
        // Log the split for tracking
        console.log(
          `Gift: ${giftData.giftType} | ` +
          `Full: $${(fullAmountCents / 100).toFixed(2)} | ` +
          `Platform keep (60%): $${(platformKeepCents / 100).toFixed(2)} | ` +
          `Recipient credit (${recipientPercentage * 100}%): $${(recipientCreditCents / 100).toFixed(2)}`
        );
        // ────────────────────────────────────────────────
        // Create notification for recipient
        await db.collection("notifications").add({
          userId: giftData.recipientId,
          type: "gift_received",
          senderId: giftData.senderId,
          senderName: giftData.senderName,
          giftType: giftData.giftType,
          postId: giftData.postId,
          message: `${giftData.senderName} sent you a ${giftData.giftType}! 🎁`,
          read: false,
          createdAt: Timestamp.now(),
        });
        console.log("Gift successfully processed:", giftData.giftType);
      } catch (error) {
        console.error("Error processing gift:", error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      console.log("Unhandled event type:", event.type);
    }
    // Always acknowledge to Stripe
    res.json({ received: true });
  });
// ===============================
// HTTPS Callable Functions
// ===============================
export const sendGift = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  const { recipientId, giftId } = data;
  if (!recipientId || !giftId)
    throw new functions.https.HttpsError("invalid-argument", "Missing recipientId or giftId");
  try {
    const result = await giveGiftToUser(recipientId, giftId);
    return { status: "success", result };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
export const updateProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  const { displayName, photoURL } = data;
  const userId = context.auth.uid;
  try {
    await auth.updateUser(userId, { displayName, photoURL });
    return { status: "success" };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});