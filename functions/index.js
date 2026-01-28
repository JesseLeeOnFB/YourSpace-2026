// Firebase Functions index.js - ALL 18 GIFTS COMPLETE
// Stripe v7 with .env configuration

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");

const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

admin.initializeApp();
const db = admin.firestore();

// COMPLETE PAYOUT STRUCTURE - 18 GIFTS
const CREATOR_PAYOUTS = {
  // Original 6 gifts
  rose: 0.12,          // $1.99 gift → $0.12 (6%)
  coffee: 0.29,        // $4.99 gift → $0.29 (6%)
  teddybear: 2.00,     // $9.99 gift → $2.00 (20%)
  cake: 0.86,          // $14.99 gift → $0.86 (6%)
  diamond: 2.88,       // $49.99 gift → $2.88 (6%)
  yacht: 40.00,        // $99.99 gift → $40.00 (40%)
  
  // NEW 12 gifts - YourSpace Place items
  houses: 0.24,        // $3.99 gift → $0.24 (6%)
  cars: 0.24,          // $3.99 gift → $0.24 (6%)
  trucks: 0.24,        // $3.99 gift → $0.24 (6%)
  pets: 0.24,          // $3.99 gift → $0.24 (6%)
  lawn: 1.35,          // $8.99 gift → $1.35 (15%)
  trees: 1.40,         // $13.99 gift → $1.40 (10%)
  driveway: 3.60,      // $29.99 gift → $3.60 (12%)
  minivan: 6.00,       // $39.99 gift → $6.00 (15%)
  crowns: 20.91,       // $69.69 gift → $20.91 (30%)
  mansion: 40.00,      // $99.99 gift → $40.00 (40%)
  ultimatejet: 40.00,  // $99.99 gift → $40.00 (40%)
  diamonds: 120.00     // $300.00 gift → $120.00 (40%)
};

// Stripe Webhook - Processes payments
exports.stripeWebhook = onRequest(async (req, res) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  const sig = req.headers["stripe-signature"];
  const webhookSecret = stripeWebhookSecret.value();
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log("✅ Webhook received:", event.type);
  
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const giftId = session.client_reference_id;
    
    console.log("💳 Checkout session completed, gift ID:", giftId);
    
    if (!giftId) {
      console.log("⚠️ No gift ID in client_reference_id");
      return res.status(200).send("OK - No gift ID");
    }
    
    try {
      const giftRef = db.collection("gifts").doc(giftId);
      const giftDoc = await giftRef.get();
      
      if (!giftDoc.exists) {
        console.error("❌ Gift not found:", giftId);
        return res.status(404).send("Gift not found");
      }
      
      const gift = giftDoc.data();
      const creatorPayout = CREATOR_PAYOUTS[gift.giftType] || 0;
      const creatorPayoutCents = Math.round(creatorPayout * 100);
      
      console.log("🎁 Processing gift:", {
        giftId,
        giftType: gift.giftType,
        toUserId: gift.toUserId,
        creatorPayout: creatorPayout,
        creatorPayoutCents: creatorPayoutCents
      });
      
      // Update gift status to paid
      await giftRef.update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        creatorPayout: creatorPayoutCents,
        stripeSessionId: session.id
      });
      
      console.log("✅ Gift updated to 'paid'");
      
      // Update creator's earnings
      const creatorRef = db.collection("users").doc(gift.toUserId);
      
      await creatorRef.update({
        payoutBalance: admin.firestore.FieldValue.increment(creatorPayoutCents),
        totalEarned: admin.firestore.FieldValue.increment(creatorPayoutCents),
        totalGiftsReceived: admin.firestore.FieldValue.increment(1),
        // Track received gifts for YourSpace Place interactive map
        [`receivedGifts.${gift.giftType}`]: admin.firestore.FieldValue.increment(1)
      });
      
      console.log(`✅ Creator earnings updated: +${creatorPayoutCents} cents ($${creatorPayout})`);
      
      // Create notification for creator
      await db.collection("users").doc(gift.toUserId).collection("notifications").add({
        type: "gift",
        fromUserId: gift.fromUserId,
        fromUsername: gift.fromUsername,
        giftType: gift.giftType,
        amount: creatorPayout,
        amountCents: creatorPayoutCents,
        postId: gift.postId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log("✅ Notification created");
      console.log(`🎉 Gift ${giftId} processed! Creator earns $${creatorPayout}`);
      
    } catch (error) {
      console.error("❌ Error processing gift:", error);
      return res.status(500).send("Internal error: " + error.message);
    }
  }
  
  res.status(200).send("OK");
});

// Automatic Payouts - Runs daily at midnight EST
exports.processPayouts = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "America/New_York"
}, async (event) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  console.log("🕐 Running payout check...");
  
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  
  try {
    // Get users with balance >= $10 (1000 cents)
    const usersSnapshot = await db.collection("users")
      .where("payoutBalance", ">=", 1000)
      .get();
    
    console.log(`📊 Found ${usersSnapshot.size} users with balance >= $10`);
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Check 14 day waiting period
      const lastPayout = user.lastPayoutDate?.toDate() || user.createdAt?.toDate() || new Date(0);
      
      if (lastPayout > fourteenDaysAgo) {
        console.log(`⏳ User ${userId} not ready for payout yet`);
        continue;
      }
      
      if (!user.stripeAccountId) {
        console.log(`⚠️ User ${userId} has no Stripe account`);
        continue;
      }
      
      const amountCents = user.payoutBalance || 0;
      const amountDollars = amountCents / 100;
      
      console.log(`💰 Processing payout for user ${userId}: $${amountDollars}`);
      
      try {
        // Create Stripe Transfer
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: "usd",
          destination: user.stripeAccountId,
          description: `YourSpace Creator Payout - 14 day period`,
          metadata: {
            userId: userId,
            payoutPeriod: `${fourteenDaysAgo.toISOString()} to ${now.toISOString()}`
          }
        });
        
        console.log(`✅ Transfer created: ${transfer.id}`);
        
        // Update user record
        await userDoc.ref.update({
          payoutBalance: 0,
          lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
          lastPayoutAmount: amountCents,
          lastPayoutTransferId: transfer.id
        });
        
        // Create payout record
        await db.collection("payouts").add({
          userId: userId,
          amount: amountCents,
          stripeTransferId: transfer.id,
          status: "completed",
          payoutDate: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Notify creator
        await db.collection("users").doc(userId).collection("notifications").add({
          type: "payout",
          amount: amountDollars,
          amountCents: amountCents,
          transferId: transfer.id,
          message: `Payout of $${amountDollars.toFixed(2)} sent to your bank account!`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Payout processed: User ${userId}, Amount $${amountDollars}`);
        
      } catch (error) {
        console.error(`❌ Error processing payout for user ${userId}:`, error);
        
        await db.collection("payouts").add({
          userId: userId,
          amount: amountCents,
          status: "failed",
          error: error.message,
          payoutDate: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    console.log("✅ Payout check complete");
    
  } catch (error) {
    console.error("❌ Error in payout process:", error);
  }
});

// Create Stripe Connect Account
exports.createConnectAccount = onCall(async (request) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  if (!request.auth) {
    throw new Error("User must be logged in");
  }
  
  const userId = request.auth.uid;
  const userEmail = request.data.email || request.auth.token.email;
  
  console.log("Creating Stripe Connect account for:", userId);
  
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userEmail,
      capabilities: {
        transfers: { requested: true }
      },
      business_type: "individual"
    });
    
    console.log("✅ Stripe account created:", account.id);
    
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
      stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: request.data.refreshUrl || `https://yourspacesocial.com/stripe-connect.html`,
      return_url: request.data.returnUrl || `https://yourspacesocial.com/dashboard.html?stripe=complete`,
      type: "account_onboarding"
    });
    
    console.log("✅ Account link created");
    
    return { url: accountLink.url };
    
  } catch (error) {
    console.error("❌ Error creating Stripe account:", error);
    throw new Error(error.message);
  }
});

// Check Stripe Connect Status
exports.checkConnectStatus = onCall(async (request) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  if (!request.auth) {
    throw new Error("User must be logged in");
  }
  
  const userId = request.auth.uid;
  
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const stripeAccountId = userDoc.data()?.stripeAccountId;
    
    if (!stripeAccountId) {
      return { status: "not_created" };
    }
    
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    await db.collection("users").doc(userId).update({
      stripeAccountStatus: account.charges_enabled ? "complete" : "pending",
      stripeTaxInfoProvided: account.charges_enabled
    });
    
    return {
      status: account.charges_enabled ? "active" : "incomplete",
      accountId: stripeAccountId,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    };
    
  } catch (error) {
    console.error("❌ Error checking account status:", error);
    throw new Error(error.message);
  }
});