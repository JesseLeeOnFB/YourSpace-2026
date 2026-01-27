// Firebase Functions index.js - V7 COMPATIBLE
// Uses environment parameters instead of functions.config()

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");

// Define environment parameters (replaces functions.config())
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

admin.initializeApp();
const db = admin.firestore();

// Gift payout amounts (what creators actually receive)
const CREATOR_PAYOUTS = {
  rose: 0.12,      // $0.12 for $1.99 gift
  coffee: 0.29,    // $0.29 for $4.99 gift
  bear: 0.58,      // $0.58 for $9.99 gift
  cake: 0.86,      // $0.86 for $14.99 gift
  diamond: 2.88,   // $2.88 for $49.99 gift
  yacht: 5.75      // $5.75 for $99.99 gift
};

// Stripe Webhook - Called when payment succeeds
exports.stripeWebhook = onRequest(async (req, res) => {
  // Initialize Stripe with the secret key
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
  
  // Handle checkout session completed (for payment links)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const giftId = session.client_reference_id;
    
    console.log("💳 Checkout session completed, gift ID:", giftId);
    
    if (!giftId) {
      console.log("⚠️ No gift ID in client_reference_id");
      return res.status(200).send("OK - No gift ID");
    }
    
    try {
      // Get gift info from Firestore
      const giftRef = db.collection("gifts").doc(giftId);
      const giftDoc = await giftRef.get();
      
      if (!giftDoc.exists) {
        console.error("❌ Gift not found:", giftId);
        return res.status(404).send("Gift not found");
      }
      
      const gift = giftDoc.data();
      const creatorPayout = CREATOR_PAYOUTS[gift.giftType] || 0;
      const creatorPayoutCents = Math.round(creatorPayout * 100); // Convert to cents
      
      console.log("🎁 Processing gift:", {
        giftId,
        giftType: gift.giftType,
        toUserId: gift.toUserId,
        creatorPayout: creatorPayout,
        creatorPayoutCents: creatorPayoutCents
      });
      
      // Update gift status
      await giftRef.update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        creatorPayout: creatorPayoutCents, // Store in cents
        stripeSessionId: session.id
      });
      
      console.log("✅ Gift updated to 'paid'");
      
      // Update creator earnings using correct field names for dashboard
      const creatorRef = db.collection("users").doc(gift.toUserId);
      
      await creatorRef.update({
        payoutBalance: admin.firestore.FieldValue.increment(creatorPayoutCents), // IN CENTS
        totalEarned: admin.firestore.FieldValue.increment(creatorPayoutCents),   // IN CENTS
        totalGiftsReceived: admin.firestore.FieldValue.increment(1)              // COUNT
      });
      
      console.log(`✅ Creator earnings updated: +${creatorPayoutCents} cents ($${creatorPayout})`);
      
      // Create notification for creator
      await db.collection("users").doc(gift.toUserId).collection("notifications").add({
        type: "gift",
        fromUserId: gift.fromUserId,
        fromUsername: gift.fromUsername,
        giftType: gift.giftType,
        amount: creatorPayout, // In dollars for display
        amountCents: creatorPayoutCents, // In cents
        postId: gift.postId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log("✅ Notification created");
      console.log(`🎉 Gift ${giftId} processed successfully! Creator earns $${creatorPayout}`);
      
    } catch (error) {
      console.error("❌ Error processing gift:", error);
      return res.status(500).send("Internal error: " + error.message);
    }
  }
  
  res.status(200).send("OK");
});

// Scheduled function - Runs every day at midnight to process payouts
exports.processPayouts = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "America/New_York"
}, async (event) => {
  // Initialize Stripe with the secret key
  const stripe = require("stripe")(stripeSecretKey.value());
  
  console.log("🕐 Running payout check...");
  
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  
  try {
    // Get all users with earnings >= $10 (1000 cents)
    const usersSnapshot = await db.collection("users")
      .where("payoutBalance", ">=", 1000) // $10 in cents
      .get();
    
    console.log(`📊 Found ${usersSnapshot.size} users with balance >= $10`);
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Check if 14 days have passed since last payout
      const lastPayout = user.lastPayoutDate?.toDate() || user.createdAt?.toDate() || new Date(0);
      
      if (lastPayout > fourteenDaysAgo) {
        console.log(`⏳ User ${userId} not ready for payout yet (last: ${lastPayout.toISOString()})`);
        continue;
      }
      
      // Check if user has Stripe Connect account
      if (!user.stripeAccountId) {
        console.log(`⚠️ User ${userId} has no Stripe account`);
        continue;
      }
      
      const amountCents = user.payoutBalance || 0;
      const amountDollars = amountCents / 100;
      
      console.log(`💰 Processing payout for user ${userId}: $${amountDollars}`);
      
      try {
        // Create Stripe Transfer to creator's connected account
        const transfer = await stripe.transfers.create({
          amount: amountCents, // Already in cents
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
          payoutBalance: 0, // Reset to 0
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
        
        // Log failed payout
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

// Create Stripe Connect account for creator
exports.createConnectAccount = onCall(async (request) => {
  // Initialize Stripe with the secret key
  const stripe = require("stripe")(stripeSecretKey.value());
  
  if (!request.auth) {
    throw new Error("User must be logged in");
  }
  
  const userId = request.auth.uid;
  const userEmail = request.data.email || request.auth.token.email;
  
  console.log("Creating Stripe Connect account for:", userId);
  
  try {
    // Create Stripe Express account
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
    
    // Save account ID to user
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
      stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create account link for onboarding
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

// Check Stripe Connect account status
exports.checkConnectStatus = onCall(async (request) => {
  // Initialize Stripe with the secret key
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
    
    // Update user's Stripe status
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