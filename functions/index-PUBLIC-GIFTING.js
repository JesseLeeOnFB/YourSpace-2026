// Firebase Functions - PUBLIC GIFTING + LEADERBOARDS + XP SYSTEM
// Stripe v7 with complete public gift features

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");

const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

admin.initializeApp();
const db = admin.firestore();

// ALL 18 GIFTS WITH CREATOR PAYOUTS
const CREATOR_PAYOUTS = {
  rose: 0.12, coffee: 0.29, teddybear: 2.00, cake: 0.86, diamond: 2.88, yacht: 40.00,
  houses: 0.24, cars: 0.24, trucks: 0.24, pets: 0.24,
  lawn: 1.35, trees: 1.40, driveway: 3.60, minivan: 6.00,
  crowns: 20.91, mansion: 40.00, ultimatejet: 40.00, diamonds: 120.00
};

// GIFT DISPLAY INFO FOR PUBLIC ANNOUNCEMENTS
const GIFT_INFO = {
  rose: { emoji: '🌹', name: 'Rose', price: 1.99 },
  coffee: { emoji: '☕', name: 'Coffee', price: 4.99 },
  teddybear: { emoji: '🧸', name: 'Teddy Bear', price: 9.99 },
  cake: { emoji: '🎂', name: 'Cake', price: 14.99 },
  diamond: { emoji: '💎', name: 'Diamond', price: 49.99 },
  yacht: { emoji: '🛥️', name: 'Yacht', price: 99.99 },
  houses: { emoji: '🏠', name: 'House', price: 3.99 },
  cars: { emoji: '🚗', name: 'Car', price: 3.99 },
  trucks: { emoji: '🚚', name: 'Truck', price: 3.99 },
  pets: { emoji: '🐕', name: 'Pet', price: 3.99 },
  lawn: { emoji: '🌱', name: 'Lawn', price: 8.99 },
  trees: { emoji: '🌳', name: 'Trees', price: 13.99 },
  driveway: { emoji: '🛣️', name: 'Driveway', price: 29.99 },
  minivan: { emoji: '🚐', name: 'Minivan', price: 39.99 },
  crowns: { emoji: '👑', name: 'Crown', price: 69.69 },
  mansion: { emoji: '🏰', name: 'Mansion', price: 99.99 },
  ultimatejet: { emoji: '✈️', name: 'Ultimate Jet', price: 99.99 },
  diamonds: { emoji: '💎💎', name: 'Diamonds', price: 300.00 }
};

// XP VALUES FOR DIFFERENT ACTIONS
const XP_VALUES = {
  completeProfile: 100,
  createPost: 10,
  receiveLike: 2,
  receiveComment: 5,
  dailyLogin: 25,
  profileView: 1,
  receiveGift: (price) => Math.floor(price * 10) // $1 = 10 XP
};

// Calculate level from XP (exponential curve)
function calculateLevel(xp) {
  // Level 1 = 0 XP
  // Level 2 = 100 XP
  // Level 3 = 250 XP
  // Level 4 = 450 XP
  // Each level requires more XP
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// ═══════════════════════════════════════════════════════════
// STRIPE WEBHOOK - WITH PUBLIC GIFT ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════
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
    
    if (!giftId) {
      return res.status(200).send("OK - No gift ID");
    }
    
    try {
      const giftRef = db.collection("gifts").doc(giftId);
      const giftDoc = await giftRef.get();
      
      if (!giftDoc.exists()) {
        console.error("❌ Gift not found:", giftId);
        return res.status(404).send("Gift not found");
      }
      
      const gift = giftDoc.data();
      const creatorPayout = CREATOR_PAYOUTS[gift.giftType] || 0;
      const creatorPayoutCents = Math.round(creatorPayout * 100);
      const giftInfo = GIFT_INFO[gift.giftType];
      
      // Update gift status
      await giftRef.update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        creatorPayout: creatorPayoutCents,
        stripeSessionId: session.id
      });
      
      // Update creator's earnings
      const creatorRef = db.collection("users").doc(gift.toUserId);
      await creatorRef.update({
        payoutBalance: admin.firestore.FieldValue.increment(creatorPayoutCents),
        totalEarned: admin.firestore.FieldValue.increment(creatorPayoutCents),
        totalGiftsReceived: admin.firestore.FieldValue.increment(1),
        [`receivedGifts.${gift.giftType}`]: admin.firestore.FieldValue.increment(1),
        // XP from receiving gift
        xp: admin.firestore.FieldValue.increment(XP_VALUES.receiveGift(giftInfo.price))
      });
      
      // Update sender's stats
      const senderRef = db.collection("users").doc(gift.fromUserId);
      await senderRef.update({
        totalGiftsSent: admin.firestore.FieldValue.increment(1),
        totalGiftValue: admin.firestore.FieldValue.increment(giftInfo.price),
        [`sentGifts.${gift.giftType}`]: admin.firestore.FieldValue.increment(1)
      });
      
      // 🔥 CREATE PUBLIC FEED POST FOR GIFT
      const isLargeGift = giftInfo.price >= 30; // Show large gifts publicly
      
      if (isLargeGift) {
        await db.collection("posts").add({
          type: "gift_announcement",
          giftType: gift.giftType,
          giftEmoji: giftInfo.emoji,
          giftName: giftInfo.name,
          giftPrice: giftInfo.price,
          fromUserId: gift.fromUserId,
          fromUsername: gift.fromUsername,
          toUserId: gift.toUserId,
          toUsername: gift.toUsername,
          text: `🔥 @${gift.fromUsername} just sent @${gift.toUsername} a ${giftInfo.emoji} ${giftInfo.name.toUpperCase()}! ($${giftInfo.price})`,
          mediaURL: "",
          mediaType: "",
          likedBy: [],
          dislikedBy: [],
          isGiftPost: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Update Top Supporters list on recipient's profile
      const creatorDoc = await creatorRef.get();
      const creatorData = creatorDoc.data();
      const topSupporters = creatorData.topSupporters || {};
      
      // Add/update sender in top supporters
      if (!topSupporters[gift.fromUserId]) {
        topSupporters[gift.fromUserId] = {
          username: gift.fromUsername,
          totalValue: 0,
          giftCount: 0
        };
      }
      
      topSupporters[gift.fromUserId].totalValue += giftInfo.price;
      topSupporters[gift.fromUserId].giftCount += 1;
      
      await creatorRef.update({ topSupporters });
      
      // Create notification for creator
      await db.collection("users").doc(gift.toUserId).collection("notifications").add({
        type: "gift",
        fromUserId: gift.fromUserId,
        fromUsername: gift.fromUsername,
        giftType: gift.giftType,
        giftEmoji: giftInfo.emoji,
        giftName: giftInfo.name,
        amount: creatorPayout,
        amountCents: creatorPayoutCents,
        postId: gift.postId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Check for level up
      const newXP = (creatorData.xp || 0) + XP_VALUES.receiveGift(giftInfo.price);
      const oldLevel = calculateLevel(creatorData.xp || 0);
      const newLevel = calculateLevel(newXP);
      
      if (newLevel > oldLevel) {
        // Level up!
        await creatorRef.update({ level: newLevel });
        
        // Create level up notification
        await db.collection("users").doc(gift.toUserId).collection("notifications").add({
          type: "level_up",
          newLevel: newLevel,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`🎉 Gift ${giftId} processed! Creator earns $${creatorPayout}, Public: ${isLargeGift}`);
      
    } catch (error) {
      console.error("❌ Error processing gift:", error);
      return res.status(500).send("Internal error: " + error.message);
    }
  }
  
  res.status(200).send("OK");
});

// ═══════════════════════════════════════════════════════════
// AUTOMATIC PAYOUTS
// ═══════════════════════════════════════════════════════════
exports.processPayouts = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "America/New_York"
}, async (event) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  
  try {
    const usersSnapshot = await db.collection("users")
      .where("payoutBalance", ">=", 1000)
      .get();
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      const lastPayout = user.lastPayoutDate?.toDate() || user.createdAt?.toDate() || new Date(0);
      
      if (lastPayout > fourteenDaysAgo) continue;
      if (!user.stripeAccountId) continue;
      
      const amountCents = user.payoutBalance || 0;
      const amountDollars = amountCents / 100;
      
      try {
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: "usd",
          destination: user.stripeAccountId,
          description: `YourSpace Creator Payout`,
          metadata: { userId: userId }
        });
        
        await userDoc.ref.update({
          payoutBalance: 0,
          lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
          lastPayoutAmount: amountCents,
          lastPayoutTransferId: transfer.id
        });
        
        await db.collection("payouts").add({
          userId: userId,
          amount: amountCents,
          stripeTransferId: transfer.id,
          status: "completed",
          payoutDate: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection("users").doc(userId).collection("notifications").add({
          type: "payout",
          amount: amountDollars,
          amountCents: amountCents,
          transferId: transfer.id,
          message: `Payout of $${amountDollars.toFixed(2)} sent to your bank account!`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } catch (error) {
        console.error(`❌ Error processing payout for user ${userId}:`, error);
      }
    }
    
  } catch (error) {
    console.error("❌ Error in payout process:", error);
  }
});

// ═══════════════════════════════════════════════════════════
// GET LEADERBOARDS
// ═══════════════════════════════════════════════════════════
exports.getLeaderboards = onCall(async (request) => {
  try {
    // Top Gifters (by total value sent)
    const topGiftersSnapshot = await db.collection("users")
      .orderBy("totalGiftValue", "desc")
      .limit(10)
      .get();
    
    const topGifters = [];
    topGiftersSnapshot.forEach(doc => {
      const data = doc.data();
      topGifters.push({
        userId: doc.id,
        username: data.username,
        totalValue: data.totalGiftValue || 0,
        giftCount: data.totalGiftsSent || 0,
        photoURL: data.photoURL
      });
    });
    
    // Top Receivers (by total gifts received)
    const topReceiversSnapshot = await db.collection("users")
      .orderBy("totalGiftsReceived", "desc")
      .limit(10)
      .get();
    
    const topReceivers = [];
    topReceiversSnapshot.forEach(doc => {
      const data = doc.data();
      topReceivers.push({
        userId: doc.id,
        username: data.username,
        giftCount: data.totalGiftsReceived || 0,
        totalEarned: (data.totalEarned || 0) / 100, // Convert cents to dollars
        photoURL: data.photoURL
      });
    });
    
    // Top Levels
    const topLevelsSnapshot = await db.collection("users")
      .orderBy("level", "desc")
      .limit(10)
      .get();
    
    const topLevels = [];
    topLevelsSnapshot.forEach(doc => {
      const data = doc.data();
      topLevels.push({
        userId: doc.id,
        username: data.username,
        level: data.level || 1,
        xp: data.xp || 0,
        photoURL: data.photoURL
      });
    });
    
    return {
      topGifters,
      topReceivers,
      topLevels
    };
    
  } catch (error) {
    console.error("Error getting leaderboards:", error);
    throw new Error("Failed to get leaderboards");
  }
});

// ═══════════════════════════════════════════════════════════
// ADD XP TO USER
// ═══════════════════════════════════════════════════════════
exports.addXP = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("User must be logged in");
  }
  
  const userId = request.auth.uid;
  const action = request.data.action; // 'post', 'like', 'comment', 'login', etc.
  
  let xpToAdd = 0;
  
  switch (action) {
    case 'createPost':
      xpToAdd = XP_VALUES.createPost;
      break;
    case 'receiveLike':
      xpToAdd = XP_VALUES.receiveLike;
      break;
    case 'receiveComment':
      xpToAdd = XP_VALUES.receiveComment;
      break;
    case 'dailyLogin':
      xpToAdd = XP_VALUES.dailyLogin;
      break;
    case 'profileView':
      xpToAdd = XP_VALUES.profileView;
      break;
    case 'completeProfile':
      xpToAdd = XP_VALUES.completeProfile;
      break;
    default:
      return { success: false, error: "Invalid action" };
  }
  
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    const oldXP = userData.xp || 0;
    const newXP = oldXP + xpToAdd;
    const oldLevel = calculateLevel(oldXP);
    const newLevel = calculateLevel(newXP);
    
    await userRef.update({
      xp: admin.firestore.FieldValue.increment(xpToAdd),
      level: newLevel
    });
    
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      // Create level up notification
      await db.collection("users").doc(userId).collection("notifications").add({
        type: "level_up",
        newLevel: newLevel,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      xpAdded: xpToAdd,
      newXP: newXP,
      oldLevel: oldLevel,
      newLevel: newLevel,
      leveledUp: leveledUp
    };
    
  } catch (error) {
    console.error("Error adding XP:", error);
    throw new Error("Failed to add XP");
  }
});

// ═══════════════════════════════════════════════════════════
// STRIPE CONNECT FUNCTIONS (unchanged)
// ═══════════════════════════════════════════════════════════
exports.createConnectAccount = onCall(async (request) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  if (!request.auth) throw new Error("User must be logged in");
  
  const userId = request.auth.uid;
  const userEmail = request.data.email || request.auth.token.email;
  
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userEmail,
      capabilities: { transfers: { requested: true } },
      business_type: "individual"
    });
    
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
    
    return { url: accountLink.url };
    
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    throw new Error(error.message);
  }
});

exports.checkConnectStatus = onCall(async (request) => {
  const stripe = require("stripe")(stripeSecretKey.value());
  
  if (!request.auth) throw new Error("User must be logged in");
  
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
    console.error("Error checking account status:", error);
    throw new Error(error.message);
  }
});
