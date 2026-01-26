// functions/index.js - Stripe Webhook Handler

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

admin.initializeApp();
const db = admin.firestore();

// Webhook signing secret
const endpointSecret = 'whsec_YH6q46Ac0aJiYP5VXnb9VpwD0Z5J116e';

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log('Payment successful for session:', session.id);
    
    try {
      // Find the most recent pending gift (within last 10 minutes)
      const tenMinutesAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 10 * 60 * 1000)
      );
      
      const pendingGiftsSnapshot = await db.collection('pendingGifts')
        .where('status', '==', 'pending')
        .where('createdAt', '>=', tenMinutesAgo)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (pendingGiftsSnapshot.empty) {
        console.log('No pending gift found');
        return res.json({ received: true, warning: 'No pending gift found' });
      }
      
      const giftDoc = pendingGiftsSnapshot.docs[0];
      const giftData = giftDoc.data();
      
      // Update pending gift status
      await giftDoc.ref.update({
        status: 'completed',
        stripeSessionId: session.id,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create completed gift record
      await db.collection('gifts').add({
        senderId: giftData.senderId,
        senderName: giftData.senderName,
        recipientId: giftData.recipientId,
        recipientName: giftData.recipientName,
        postId: giftData.postId,
        giftType: giftData.giftType,
        status: 'delivered',
        stripeSessionId: session.id,
        createdAt: giftData.createdAt,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create notification for recipient
      await db.collection('notifications').add({
        userId: giftData.recipientId,
        type: 'gift_received',
        senderId: giftData.senderId,
        senderName: giftData.senderName,
        giftType: giftData.giftType,
        postId: giftData.postId,
        message: `${giftData.senderName} sent you a ${giftData.giftType}! 🎁`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update recipient's gift count
      const recipientRef = db.collection('users').doc(giftData.recipientId);
      await recipientRef.update({
        [`giftsReceived.${giftData.giftType}`]: admin.firestore.FieldValue.increment(1),
        totalGiftsReceived: admin.firestore.FieldValue.increment(1)
      });
      
      // Update sender's gift count
      const senderRef = db.collection('users').doc(giftData.senderId);
      await senderRef.update({
        [`giftsSent.${giftData.giftType}`]: admin.firestore.FieldValue.increment(1),
        totalGiftsSent: admin.firestore.FieldValue.increment(1)
      });
      
      console.log('Gift successfully processed:', giftData.giftType);
      
    } catch (error) {
      console.error('Error processing gift:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.json({ received: true });
});

// Optional: Function to clean up old pending gifts (run daily)
exports.cleanupPendingGifts = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const oneDayAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const oldPending = await db.collection('pendingGifts')
      .where('status', '==', 'pending')
      .where('createdAt', '<', oneDayAgo)
      .get();
    
    const batch = db.batch();
    oldPending.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    await batch.commit();
    console.log(`Cleaned up ${oldPending.size} expired pending gifts`);
  });