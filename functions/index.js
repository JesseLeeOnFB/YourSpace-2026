// Firebase Cloud Functions - index.js
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

admin.initializeApp();
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════
// 1. CREATE STRIPE CONNECT ACCOUNT
// ═══════════════════════════════════════════════════════════
exports.createConnectAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { userId, email, refreshUrl, returnUrl } = data;

  try {
    // Check if account already exists
    const userDoc = await db.collection('users').doc(userId).get();
    let stripeAccountId = userDoc.data()?.stripeAccountId;

    // Create new account if needed
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      stripeAccountId = account.id;

      // Save to Firestore
      await db.collection('users').doc(userId).set({
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: 'pending',
        stripeTaxInfoProvided: false,
      }, { merge: true });
    }

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('Stripe account creation error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 2. PROCESS GIFT PURCHASE
// ═══════════════════════════════════════════════════════════
exports.purchaseGift = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { recipientId, giftType, giftPrice, giftName } = data;
  const buyerId = context.auth.uid;

  try {
    // Get recipient data
    const recipientDoc = await db.collection('users').doc(recipientId).get();
    if (!recipientDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Recipient not found');
    }

    const recipientData = recipientDoc.data();
    
    // Calculate amounts (70% to creator, 30% platform fee)
    const totalAmount = giftPrice; // in cents
    const creatorAmount = Math.floor(totalAmount * 0.70);
    const platformFee = totalAmount - creatorAmount;

    // Update recipient balances
    await db.collection('users').doc(recipientId).update({
      payoutBalance: admin.firestore.FieldValue.increment(creatorAmount),
      totalEarned: admin.firestore.FieldValue.increment(creatorAmount),
      totalGiftsReceived: admin.firestore.FieldValue.increment(1),
      [`rewards.${giftType}`]: admin.firestore.FieldValue.increment(1),
    });

    // Update buyer stats
    await db.collection('users').doc(buyerId).update({
      totalGiftsSent: admin.firestore.FieldValue.increment(1),
      totalSpent: admin.firestore.FieldValue.increment(totalAmount),
    });

    // Create transaction record
    await db.collection('transactions').add({
      buyerId: buyerId,
      recipientId: recipientId,
      giftType: giftType,
      giftName: giftName,
      amount: totalAmount,
      creatorAmount: creatorAmount,
      platformFee: platformFee,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create notification for recipient
    await db.collection('notifications').add({
      userId: recipientId,
      type: 'gift_received',
      fromUserId: buyerId,
      giftType: giftType,
      giftName: giftName,
      amount: creatorAmount,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Gift sent! Creator earned $${(creatorAmount / 100).toFixed(2)}`,
    };
  } catch (error) {
    console.error('Gift purchase error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 3. UPDATE POST STATS (Triggered when post is created)
// ═══════════════════════════════════════════════════════════
exports.onPostCreated = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const userId = post.userId;

    if (!userId) return;

    try {
      await db.collection('users').doc(userId).update({
        totalPosts: admin.firestore.FieldValue.increment(1),
      });
    } catch (error) {
      console.error('Error updating post stats:', error);
    }
  });

// ═══════════════════════════════════════════════════════════
// 4. UPDATE LIKE STATS (Triggered when post is liked)
// ═══════════════════════════════════════════════════════════
exports.onPostLiked = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = after.userId;

    if (!userId) return;

    // Check if likes increased
    const beforeLikes = before.likedBy?.length || 0;
    const afterLikes = after.likedBy?.length || 0;
    const likesDiff = afterLikes - beforeLikes;

    if (likesDiff !== 0) {
      try {
        await db.collection('users').doc(userId).update({
          totalLikes: admin.firestore.FieldValue.increment(likesDiff),
        });
      } catch (error) {
        console.error('Error updating like stats:', error);
      }
    }

    // Check if comments increased
    const beforeComments = before.comments?.length || 0;
    const afterComments = after.comments?.length || 0;
    const commentsDiff = afterComments - beforeComments;

    if (commentsDiff !== 0) {
      try {
        await db.collection('users').doc(userId).update({
          totalComments: admin.firestore.FieldValue.increment(commentsDiff),
        });
      } catch (error) {
        console.error('Error updating comment stats:', error);
      }
    }
  });

// ═══════════════════════════════════════════════════════════
// 5. PROCESS PAYOUT (Called manually or via scheduled job)
// ═══════════════════════════════════════════════════════════
exports.processPayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData.stripeAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'Stripe account not connected');
    }

    if (userData.stripeAccountStatus !== 'complete') {
      throw new functions.https.HttpsError('failed-precondition', 'Complete Stripe verification first');
    }

    const payoutBalance = userData.payoutBalance || 0;

    // Minimum payout threshold: $10 (1000 cents)
    if (payoutBalance < 1000) {
      throw new functions.https.HttpsError('failed-precondition', 'Minimum payout is $10');
    }

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: payoutBalance,
      currency: 'usd',
      destination: userData.stripeAccountId,
      description: `YourSpace payout for ${userData.displayName || userData.email}`,
    });

    // Update user balance
    await db.collection('users').doc(userId).update({
      payoutBalance: 0,
      lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record payout
    await db.collection('payouts').add({
      userId: userId,
      amount: payoutBalance,
      stripeTransferId: transfer.id,
      status: 'completed',
      payoutDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      amount: payoutBalance,
      message: `Payout of $${(payoutBalance / 100).toFixed(2)} processed successfully!`,
    };
  } catch (error) {
    console.error('Payout error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ═══════════════════════════════════════════════════════════
// 6. CHECK STRIPE ACCOUNT STATUS (Webhook handler)
// ═══════════════════════════════════════════════════════════
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle account.updated event
  if (event.type === 'account.updated') {
    const account = event.data.object;
    
    // Find user with this Stripe account
    const usersSnapshot = await db.collection('users')
      .where('stripeAccountId', '==', account.id)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const detailsSubmitted = account.details_submitted;
      const chargesEnabled = account.charges_enabled;
      const payoutsEnabled = account.payouts_enabled;

      await userDoc.ref.update({
        stripeAccountStatus: (detailsSubmitted && chargesEnabled && payoutsEnabled) ? 'complete' : 'pending',
        stripeTaxInfoProvided: detailsSubmitted,
      });
    }
  }

  res.json({ received: true });
});