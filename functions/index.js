// functions/index.js
// YourSpace Firebase Cloud Functions (Node.js 20, v2 Gen)

const { defineString } = require("firebase-functions/params");
const { onCall, https, runWith } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const stripeLib = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// ═══════════════════════════════════════════════
// Environment parameters
// ═══════════════════════════════════════════════
const STRIPE_KEY = defineString("STRIPE_KEY");
const STRIPE_WEBHOOK_SECRET = defineString("STRIPE_WEBHOOK_SECRET");

const stripe = stripeLib(STRIPE_KEY.value());

// ═══════════════════════════════════════════════
// 1. CREATE STRIPE CONNECT ACCOUNT
// ═══════════════════════════════════════════════
exports.createConnectAccount = runWith({ minInstances: 0 }).https.onCall(async (data, context) => {
  if (!context.auth) throw new https.HttpsError("unauthenticated", "User must be logged in");

  const { userId, email, refreshUrl, returnUrl } = data;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    let stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });

      stripeAccountId = account.id;
      await db.collection("users").doc(userId).set(
        {
          stripeAccountId,
          stripeAccountStatus: "pending",
          stripeTaxInfoProvided: false,
        },
        { merge: true }
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error("Stripe account creation error:", error);
    throw new https.HttpsError("internal", error.message);
  }
});

// ═══════════════════════════════════════════════
// 2. PROCESS GIFT PURCHASE
// ═══════════════════════════════════════════════
exports.purchaseGift = runWith({ minInstances: 0 }).https.onCall(async (data, context) => {
  if (!context.auth) throw new https.HttpsError("unauthenticated", "User must be logged in");

  const { recipientId, giftType, giftPrice, giftName } = data;
  const buyerId = context.auth.uid;

  try {
    const recipientDoc = await db.collection("users").doc(recipientId).get();
    if (!recipientDoc.exists) throw new https.HttpsError("not-found", "Recipient not found");

    const totalAmount = giftPrice; // cents
    const creatorAmount = Math.floor(totalAmount * 0.7);
    const platformFee = totalAmount - creatorAmount;

    await db.collection("users").doc(recipientId).update({
      payoutBalance: admin.firestore.FieldValue.increment(creatorAmount),
      totalEarned: admin.firestore.FieldValue.increment(creatorAmount),
      totalGiftsReceived: admin.firestore.FieldValue.increment(1),
      [`rewards.${giftType}`]: admin.firestore.FieldValue.increment(1),
    });

    await db.collection("users").doc(buyerId).update({
      totalGiftsSent: admin.firestore.FieldValue.increment(1),
      totalSpent: admin.firestore.FieldValue.increment(totalAmount),
    });

    await db.collection("transactions").add({
      buyerId,
      recipientId,
      giftType,
      giftName,
      amount: totalAmount,
      creatorAmount,
      platformFee,
      status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("notifications").add({
      userId: recipientId,
      type: "gift_received",
      fromUserId: buyerId,
      giftType,
      giftName,
      amount: creatorAmount,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Gift sent! Creator earned $${(creatorAmount / 100).toFixed(2)}` };
  } catch (error) {
    console.error("Gift purchase error:", error);
    throw new https.HttpsError("internal", error.message);
  }
});

// ═══════════════════════════════════════════════
// 3. UPDATE POST STATS
// ═══════════════════════════════════════════════
exports.onPostCreated = runWith({ minInstances: 0 }).firestore.document("posts/{postId}").onCreate(async (snap, context) => {
  const post = snap.data();
  const userId = post.userId;
  if (!userId) return;

  try {
    await db.collection("users").doc(userId).update({
      totalPosts: admin.firestore.FieldValue.increment(1),
    });
  } catch (err) {
    console.error("Error updating post stats:", err);
  }
});

// ═══════════════════════════════════════════════
// 4. UPDATE LIKE/COMMENT STATS
// ═══════════════════════════════════════════════
exports.onPostLiked = runWith({ minInstances: 0 }).firestore.document("posts/{postId}").onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  const userId = after.userId;
  if (!userId) return;

  const likesDiff = (after.likedBy?.length || 0) - (before.likedBy?.length || 0);
  const commentsDiff = (after.comments?.length || 0) - (before.comments?.length || 0);

  try {
    if (likesDiff !== 0) await db.collection("users").doc(userId).update({ totalLikes: admin.firestore.FieldValue.increment(likesDiff) });
    if (commentsDiff !== 0) await db.collection("users").doc(userId).update({ totalComments: admin.firestore.FieldValue.increment(commentsDiff) });
  } catch (err) {
    console.error("Error updating like/comment stats:", err);
  }
});

// ═══════════════════════════════════════════════
// 5. PROCESS PAYOUT
// ═══════════════════════════════════════════════
exports.processPayout = runWith({ minInstances: 0 }).https.onCall(async (data, context) => {
  if (!context.auth) throw new https.HttpsError("unauthenticated", "User must be logged in");

  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData.stripeAccountId) throw new https.HttpsError("failed-precondition", "Stripe account not connected");
    if (userData.stripeAccountStatus !== "complete") throw new https.HttpsError("failed-precondition", "Complete Stripe verification first");

    const payoutBalance = userData.payoutBalance || 0;
    if (payoutBalance < 1000) throw new https.HttpsError("failed-precondition", "Minimum payout is $10");

    const transfer = await stripe.transfers.create({
      amount: payoutBalance,
      currency: "usd",
      destination: userData.stripeAccountId,
      description: `YourSpace payout for ${userData.displayName || userData.email}`,
    });

    await db.collection("users").doc(userId).update({
      payoutBalance: 0,
      lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("payouts").add({
      userId,
      amount: payoutBalance,
      stripeTransferId: transfer.id,
      status: "completed",
      payoutDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, amount: payoutBalance, message: `Payout of $${(payoutBalance / 100).toFixed(2)} processed successfully!` };
  } catch (err) {
    console.error("Payout error:", err);
    throw new https.HttpsError("internal", err.message);
  }
});

// ═══════════════════════════════════════════════
// 6. STRIPE WEBHOOK
// ═══════════════════════════════════════════════
exports.stripeWebhook = runWith({ minInstances: 0 }).https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = STRIPE_WEBHOOK_SECRET.value();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "account.updated") {
    const account = event.data.object;

    const usersSnapshot = await db.collection("users").where("stripeAccountId", "==", account.id).limit(1).get();
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      await userDoc.ref.update({
        stripeAccountStatus: account.details_submitted && account.charges_enabled && account.payouts_enabled ? "complete" : "pending",
        stripeTaxInfoProvided: account.details_submitted,
      });
    }
  }

  res.json({ received: true });
});
