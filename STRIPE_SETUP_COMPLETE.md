# 💳 STRIPE SETUP GUIDE - Complete Instructions

## Step 1: Get Your Stripe Keys (5 minutes)

1. Go to https://stripe.com
2. Click "Sign in" (or "Sign up" if you don't have an account)
3. Complete business verification
4. In Stripe Dashboard, click **Developers** in top right
5. Click **API keys** in left sidebar
6. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"

## Step 2: Add Publishable Key to rewards.js

**Open:** `rewards.js`

**Find line 23:**
```javascript
const stripePublishableKey = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';
```

**Replace with YOUR key:**
```javascript
const stripePublishableKey = 'pk_test_51ABC123...YOUR_ACTUAL_KEY';
```

**Save the file.**

---

## Step 3: Understanding Demo Mode vs Live Mode

### Currently (Demo Mode):
- ✅ Modal opens and displays packages
- ⚠️ Payment uses `confirm()` dialog (fake)
- ⚠️ No real money charged
- ✅ Rewards still save to Firestore

### For Real Payments (Requires Backend):
You need a server to create Stripe checkout sessions. Here are your options:

---

## OPTION A: Quick Backend (Vercel Functions - Easiest)

### 1. Create `api/create-checkout.js`:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { packageId, postId, creatorUserId, senderId } = req.body;

  const packages = {
    'basic-20': { price: 999, name: 'Basic Pack' },
    'standard-50': { price: 2499, name: 'Standard Pack' },
    'premium-100': { price: 4999, name: 'Premium Pack' },
    'ultimate-jet': { price: 9999, name: 'Ultimate Jet' }
  };

  const pkg = packages[packageId];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.name },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://yoursite.com/feed.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://yoursite.com/feed.html?canceled=true`,
      metadata: { packageId, postId, creatorUserId, senderId }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 2. Create `.env` file:
```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

### 3. Deploy to Vercel:
```bash
npm install -g vercel
vercel deploy
```

---

## OPTION B: Firebase Cloud Functions

### 1. Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### 2. Create `functions/index.js`:
```javascript
const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret);
const admin = require('firebase-admin');
admin.initializeApp();

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { packageId, postId, creatorUserId } = data;

  const packages = {
    'basic-20': { price: 999, name: 'Basic Pack' },
    'standard-50': { price: 2499, name: 'Standard Pack' },
    'premium-100': { price: 4999, name: 'Premium Pack' },
    'ultimate-jet': { price: 9999, name: 'Ultimate Jet' }
  };

  const pkg = packages[packageId];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: pkg.name },
        unit_amount: pkg.price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'https://yoursite.com/feed.html?success=true',
    cancel_url: 'https://yoursite.com/feed.html?canceled=true',
    metadata: { packageId, postId, creatorUserId, senderId: context.auth.uid }
  });

  return { sessionId: session.id };
});
```

### 3. Set secret key:
```bash
firebase functions:config:set stripe.secret="sk_test_YOUR_KEY"
```

### 4. Deploy:
```bash
firebase deploy --only functions
```

---

## Step 4: Update rewards.js to Call Backend

**Replace the TODO section in rewards.js (around line 77):**

### For Vercel:
```javascript
const response = await fetch('https://yoursite.vercel.app/api/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    packageId,
    postId,
    creatorUserId,
    senderId: currentUser.uid,
  })
});

const { sessionId } = await response.json();
await stripe.redirectToCheckout({ sessionId });
```

### For Firebase:
```javascript
const createCheckout = firebase.functions().httpsCallable('createCheckoutSession');
const result = await createCheckout({
  packageId,
  postId,
  creatorUserId
});

await stripe.redirectToCheckout({ sessionId: result.data.sessionId });
```

---

## Step 5: Handle Successful Payments

Add this to `rewards.js` after imports:

```javascript
// Check for successful payment on page load
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success') === 'true') {
  alert('🎉 Payment successful! Reward sent!');
  window.history.replaceState({}, '', 'feed.html'); // Clean URL
}

if (urlParams.get('canceled') === 'true') {
  alert('Payment canceled.');
  window.history.replaceState({}, '', 'feed.html');
}
```

---

## Step 6: Set Up Webhooks (Important!)

Webhooks ensure payments are recorded even if user closes browser.

### 1. In Stripe Dashboard:
- Go to **Developers** → **Webhooks**
- Click **Add endpoint**
- URL: `https://yoursite.com/api/webhook` (or your function URL)
- Events: Select `checkout.session.completed`

### 2. Create webhook handler:
```javascript
// api/webhook.js (Vercel) or functions/webhook (Firebase)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { packageId, postId, creatorUserId, senderId } = session.metadata;

    // Record transaction in Firestore
    // Update creator earnings
    // Send notifications
  }

  res.json({ received: true });
}
```

---

## Quick Reference

### Where to put what:

1. **Publishable Key** → `rewards.js` line 23
2. **Secret Key** → Backend `.env` file (NEVER in frontend!)
3. **Webhook Secret** → Backend `.env` file

### Test vs Live Mode:

- **Test:** `pk_test_...` and `sk_test_...`
- **Live:** `pk_live_...` and `sk_live_...`

### Before Going Live:
1. Switch to live keys
2. Complete Stripe verification
3. Test with real card
4. Set up proper error handling

---

## Need Help?

Contact: skeeterjeeter8@gmail.com

**For now, demo mode works for testing UI! Build backend when ready for real money.**
