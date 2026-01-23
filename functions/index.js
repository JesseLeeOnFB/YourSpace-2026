const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const stripeLib = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// Define secrets (resolved at runtime inside functions)
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

// Gift payout amounts
const CREATOR_PAYOUTS = {
  rose: 0.12,
  coffee: 0.29,
  bear: 0.58,
  cake: 0.86,
  diamond: 2.88,
  yacht: 5.75
};

// Stripe Webhook
exports.stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const stripe = stripeLib(STRIPE_SECRET.value(), {
    apiVersion: "2025-12-15.clover"
  });

  const sig = req.headers["stripe-signature"];
  const webhookSecret = STRIPE_WEBHOOK_SECRET.value();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const giftId = paymentIntent.metadata.giftId;

    if (!giftId) {
      console.log("No giftId in metadata");
      return res.status(200).send("OK");
    }

    try {
      const giftRef = db.collection("gifts").doc(giftId);
      const giftDoc = await giftRef.get();

      if (!giftDoc.exists) {
        console.error("Gift not found:", giftId);
        return res.status(404).send("Gift not found");
      }

      const gift = giftDoc.data();
      const creatorPayout = CREATOR_PAYOUTS[gift.giftType] || 0;

      await giftRef.update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        creatorPayout: creatorPayout,
        stripePaymentIntent: paymentIntent.id
      });

      const creatorRef = db.collection("users").doc(gift.toUserId);
      await creatorRef.update({
        totalEarnings: admin.firestore.FieldValue.increment(creatorPayout),
        giftCount: admin.firestore.FieldValue.increment(1)
      });

      await db.collection("users").doc(gift.toUserId).collection("notifications").add({
        type: "gift",
        fromUserId: gift.fromUserId,
        fromUsername: gift.fromUsername,
        giftType: gift.giftType,
        amount: creatorPayout,
        postId: gift.postId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Gift processed: ${giftId}, Creator earns: $${creatorPayout}`);
    } catch (error) {
      console.error("Error processing gift:", error);
      return res.status(500).send("Internal error");
    }
  }

  res.status(200).send("OK");
});

// Scheduled payout processor
exports.processPayouts = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/New_York",
    secrets: [STRIPE_SECRET]
  },
  async (event) => {
    const stripe = stripeLib(STRIPE_SECRET.value(), {
      apiVersion: "2025-12-15.clover"
    });

    console.log("Running payout check…");

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    try {
      const usersSnapshot = await db.collection("users")
        .where("totalEarnings", ">=", 10)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        const lastPayout = user.lastPayoutDate?.toDate() || user.createdAt?.toDate() || new Date(0);

        if (lastPayout > fourteenDaysAgo) {
          console.log(`User ${userId} not ready for payout yet (last payout too recent)`);
          continue;
        }

        if (!user.stripeAccountId) {
          console.log(`User ${userId} has no Stripe account connected`);
          continue;
        }

        const amount = user.totalEarnings;
        if (amount < 10) continue;

        try {
          // CRITICAL CHECK: Verify transfers are enabled on the connected account
          const account = await stripe.accounts.retrieve(user.stripeAccountId);

          if (!account.capabilities?.transfers?.enabled || !account.payouts_enabled) {
            console.log(
              `Skipping payout for user ${userId} - transfers not enabled yet ` +
              `(transfers: ${account.capabilities?.transfers?.status || 'unknown'}, ` +
              `payouts_enabled: ${account.payouts_enabled})`
            );
            continue;
          }

          // Re-fetch fresh amount to avoid race conditions
          const freshDoc = await userDoc.ref.get();
          const freshAmount = freshDoc.data().totalEarnings;
          if (freshAmount < 10) continue;

          const transfer = await stripe.transfers.create({
            amount: Math.round(freshAmount * 100),
            currency: "usd",
            destination: user.stripeAccountId,
            description: `YourSpace Creator Payout - 14 day period`,
            metadata: {
              userId: userId,
              payoutPeriod: `${fourteenDaysAgo.toISOString()} to ${now.toISOString()}`
            }
          });

          await userDoc.ref.update({
            totalEarnings: 0,
            lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
            lastPayoutAmount: freshAmount,
            lastPayoutTransferId: transfer.id
          });

          await db.collection("payouts").add({
            userId: userId,
            amount: freshAmount,
            stripeTransferId: transfer.id,
            status: "completed",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          await db.collection("users").doc(userId).collection("notifications").add({
            type: "payout",
            amount: freshAmount,
            transferId: transfer.id,
            message: `Payout of $${freshAmount.toFixed(2)} sent to your bank account!`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`Payout processed: User ${userId}, Amount $${freshAmount}, Transfer ID: ${transfer.id}`);
        } catch (error) {
          console.error(`Error processing payout for user ${userId}:`, error.message);
          await db.collection("payouts").add({
            userId: userId,
            amount: amount,
            status: "failed",
            error: error.message,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      console.log("Payout check complete");
    } catch (error) {
      console.error("Error in payout process:", error);
    }
  }
);

// Create Stripe Connect account
exports.createConnectAccount = onCall(
  { secrets: [STRIPE_SECRET] },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be logged in");
    }

    const stripe = stripeLib(STRIPE_SECRET.value(), {
      apiVersion: "2025-12-15.clover"
    });

    const userId = request.auth.uid;
    const userEmail = request.data.email;

    try {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        },
        business_type: "individual"
      });

      await db.collection("users").doc(userId).update({
        stripeAccountId: account.id,
        stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `https://yourspacesocial.com/dashboard.html?refresh=true`,
        return_url: `https://yourspacesocial.com/dashboard.html?setup=complete`,
        type: "account_onboarding"
      });

      return { url: accountLink.url };
    } catch (error) {
      console.error("Error creating Stripe account:", error);
      throw new Error(error.message);
    }
  }
);

// Check Connect status (updated to include transfersEnabled)
exports.checkConnectStatus = onCall(
  { secrets: [STRIPE_SECRET] },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be logged in");
    }

    const stripe = stripeLib(STRIPE_SECRET.value(), {
      apiVersion: "2025-12-15.clover"
    });

    const userId = request.auth.uid;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const stripeAccountId = userDoc.data()?.stripeAccountId;

      if (!stripeAccountId) {
        return { status: "not_created" };
      }

      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        status: account.charges_enabled ? "active" : "incomplete",
        accountId: stripeAccountId,
        payoutsEnabled: account.payouts_enabled,
        transfersEnabled: account.capabilities?.transfers?.enabled || false,
        transfersStatus: account.capabilities?.transfers?.status || "unknown"
      };
    } catch (error) {
      console.error("Error checking account status:", error);
      throw new Error(error.message);
    }
  }
);