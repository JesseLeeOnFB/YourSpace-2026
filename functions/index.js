// index.js (Firebase Cloud Functions 2nd gen / v2 syntax, secrets-safe)

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// Helper to safely create Stripe instance inside handlers only
function getStripe() {
  if (!process.env.STRIPE_KEY) {
    throw new Error("STRIPE_KEY environment variable is not set (check secrets)");
  }
  return new Stripe(process.env.STRIPE_KEY, { apiVersion: "2024-06-20" });
}

// ════════════════════════════════════
// 1. CREATE STRIPE CONNECT ACCOUNT
// ════════════════════════════════════
exports.createConnectAccount = onCall(
  {
    secrets: ["STRIPE_KEY"],
    memory: "256MB",
    timeoutSeconds: 60,
  },
  async (request) => {
    console.log('createConnectAccount started', {
      authUid: request.auth?.uid,
      data: request.data,
    });

    try {
      if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");

      const { userId, email, refreshUrl, returnUrl } = request.data || {};
      if (!userId || !email || !refreshUrl || !returnUrl) {
        throw new HttpsError("invalid-argument", "Missing required fields");
      }

      console.log('Params OK', { userId, email, refreshUrl, returnUrl });

      const stripe = new Stripe(process.env.STRIPE_KEY, { apiVersion: "2024-06-20" });

      const userDoc = await db.collection("users").doc(userId).get();
      let stripeAccountId = userDoc.data()?.stripeAccountId;

      if (!stripeAccountId) {
        console.log('Creating new Stripe account');
        const account = await stripe.accounts.create({
          type: "express",
          email,
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
        console.log('Account created', stripeAccountId);
      }

      console.log('Creating account link');
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      console.log('Account link created', accountLink.url);
      return { url: accountLink.url };
    } catch (err) {
      console.error('createConnectAccount failed:', {
        message: err.message,
        type: err.type,
        code: err.code,
        param: err.param,
        stack: err.stack?.substring(0, 500),
      });

      if (err instanceof HttpsError) throw err;

      // Return structured error so client can show better message
      throw new HttpsError("internal", `Failed to create Stripe link: ${err.message || 'Unknown error'}`);
    }
  }
);

// ════════════════════════════════════
// 2. STRIPE WEBHOOK
// ════════════════════════════════════
exports.stripeWebhook = onRequest(
  {
    secrets: ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET"],
    memory: "256MB",
    timeoutSeconds: 60,
    // Add this to ensure raw body is available
    rawBody: true,  // Key fix: preserves raw buffer
  },
  async (req, res) => {
    // Manually buffer the raw body if not already present (safety net)
    if (!req.rawBody) {
      let body = [];
      req.on('data', (chunk) => body.push(chunk));
      req.on('end', () => {
        req.rawBody = Buffer.concat(body);
        processWebhook(req, res);  // Call a separate function below
      });
      return;  // Wait for buffering
    }

    processWebhook(req, res);
  }
);

// Helper to avoid duplicating logic
async function processWebhook(req, res) {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,  // Now guaranteed to be the raw Buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`Received Stripe event: ${event.type}`);  // For debugging

    if (event.type === "account.updated") {
      const account = event.data.object;
      const usersSnapshot = await db.collection("users")
        .where("stripeAccountId", "==", account.id)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          stripeAccountStatus:
            account.details_submitted && account.charges_enabled && account.payouts_enabled
              ? "complete"
              : "pending",
          stripeTaxInfoProvided: account.details_submitted,
        });
        console.log(`Updated user for account ${account.id}`);
      }
    }

    // Add handling for other events if needed, e.g., "account.application.authorized"
    // For now, just ack them
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message, err.stack);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════
// 3. PURCHASE GIFT
// ═══════════════════════════════════════════════
exports.purchaseGift = onCall(
  {
    memory: "512MB",
    timeoutSeconds: 60,
  },
  async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "User must be logged in");

    const { recipientId, giftType, giftPrice, giftName } = data;
    const buyerId = auth.uid;

    try {
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      if (!recipientDoc.exists) throw new HttpsError("not-found", "Recipient not found");

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
      throw new HttpsError("internal", error.message);
    }
  }
);

// ═══════════════════════════════════════════════
// 4. UPDATE POST STATS
// ═══════════════════════════════════════════════
exports.onPostCreated = onDocumentCreated(
  "posts/{postId}",
  {
    memory: "256MB",
    timeoutSeconds: 30,
  },
  async (event) => {
    const post = event.data.data();
    const userId = post.userId;
    if (!userId) return;

    try {
      await db.collection("users").doc(userId).update({
        totalPosts: admin.firestore.FieldValue.increment(1),
      });
    } catch (err) {
      console.error("Error updating post stats:", err);
    }
  }
);

exports.onPostLiked = onDocumentUpdated(
  "posts/{postId}",
  {
    memory: "256MB",
    timeoutSeconds: 30,
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
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
  }
);

// ═══════════════════════════════════════════════
// 5. PROCESS PAYOUT
// ═══════════════════════════════════════════════
exports.processPayout = onCall(
  {
    secrets: ["STRIPE_KEY"],
    memory: "512MB",
    timeoutSeconds: 60,
  },
  async (request) => {
    const stripe = getStripe();

    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "User must be logged in");

    const userId = auth.uid;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData.stripeAccountId) throw new HttpsError("failed-precondition", "Stripe account not connected");
      if (userData.stripeAccountStatus !== "complete") throw new HttpsError("failed-precondition", "Complete Stripe verification first");

      const payoutBalance = userData.payoutBalance || 0;
      if (payoutBalance < 1000) throw new HttpsError("failed-precondition", "Minimum payout is $10");

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
      throw new HttpsError("internal", err.message);
    }
  }
);