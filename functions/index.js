// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// Use Firebase secrets for Stripe keys
const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: "2024-06-20",
});

// ════════════════════════════════════
// 1. CREATE STRIPE CONNECT ACCOUNT
// ════════════════════════════════════
exports.createConnectAccount = functions
  .runWith({ secrets: ["STRIPE_KEY"] })
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User must be logged in");

    const { userId, email, refreshUrl, returnUrl } = data;

    const userDoc = await db.collection("users").doc(userId).get();
    let stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
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
  });

// ════════════════════════════════════
// 2. PROCESS GIFT PURCHASE
// ════════════════════════════════════
exports.purchaseGift = functions
  .runWith({ secrets: ["STRIPE_KEY"] })
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User must be logged in");

    const { recipientId, giftType, giftPrice, giftName } = data;
    const buyerId = context.auth.uid;

    try {
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      if (!recipientDoc.exists)
        throw new functions.https.HttpsError("not-found", "Recipient not found");

      const totalAmount = giftPrice; // in cents
      const creatorAmount = Math.floor(totalAmount * 0.7);
      const platformFee = totalAmount - creatorAmount;

      // Update recipient stats
      await db.collection("users").doc(recipientId).update({
        payoutBalance: admin.firestore.FieldValue.increment(creatorAmount),
        totalEarned: admin.firestore.FieldValue.increment(creatorAmount),
        totalGiftsReceived: admin.firestore.FieldValue.increment(1),
        [`rewards.${giftType}`]: admin.firestore.FieldValue.increment(1),
      });

      // Update buyer stats
      await db.collection("users").doc(buyerId).update({
        totalGiftsSent: admin.firestore.FieldValue.increment(1),
        totalSpent: admin.firestore.FieldValue.increment(totalAmount),
      });

      // Log transaction
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

      // Send notification
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
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// ════════════════════════════════════
// 3. UPDATE POST STATS
// ════════════════════════════════════
exports.onPostCreated = functions
  .runWith({ secrets: ["STRIPE_KEY"] })
  .firestore.document("posts/{postId}")
  .onCreate(async (snap) => {
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

// ════════════════════════════════════
// 4. UPDATE LIKE/COMMENT STATS
// ════════════════════════════════════
exports.onPostLiked = functions
  .runWith({ secrets: ["STRIPE_KEY"] })
  .firestore.document("posts/{postId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = after.userId;
    if (!userId) return;

    const likesDiff = (after.likedBy?.length || 0) - (before.likedBy?.length || 0);
    const commentsDiff = (after.comments?.length || 0) - (before.comments?.length || 0);

    try {
      if (likesDiff !== 0)
        await db.collection("users").doc(userId).update({
          totalLikes: admin.firestore.FieldValue.increment(likesDiff),
        });
      if (commentsDiff !== 0)
        await db.collection("users").doc(userId).update({
          totalComments: admin.firestore.FieldValue.increment(commentsDiff),
        });
    } catch (err) {
      console.error("Error updating like/comment stats:", err);
    }
  });

// ════════════════════════════════════
// 5. PROCESS PAYOUT
// ════════════════════════════════════
exports.processPayout = functions
  .runWith({ secrets: ["STRIPE_KEY"] })
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User must be logged in");

    const userId = context.auth.uid;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData.stripeAccountId)
        throw new functions.https.HttpsError("failed-precondition", "Stripe account not connected");
      if (userData.stripeAccountStatus !== "complete")
        throw new functions.https.HttpsError("failed-precondition", "Complete Stripe verification first");

      const payoutBalance = userData.payoutBalance || 0;
      if (payoutBalance < 1000)
        throw new functions.https.HttpsError("failed-precondition", "Minimum payout is $10");

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
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

// ════════════════════════════════════
// 6. STRIPE WEBHOOK
// ════════════════════════════════════
exports.stripeWebhook = functions
  .runWith({ secrets: ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

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
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
