// rewards.js - Virtual Rewards System with Stripe Integration

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Stripe publishable key (TEST MODE - replace with live key in production)
const stripePublishableKey = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';
const stripe = Stripe(stripePublishableKey);

// Reward packages configuration
const REWARD_PACKAGES = {
  'basic-20': {
    name: 'Basic Pack',
    description: '20 Houses',
    price: 999, // $9.99 in cents
    rewards: {
      house: 20
    },
    creatorPayout: 200 // $2.00 (20 × $0.10)
  },
  'standard-50': {
    name: 'Standard Pack',
    description: '50 Houses + 5 Cars',
    price: 2499, // $24.99 in cents
    rewards: {
      house: 50,
      car: 5
    },
    creatorPayout: 550 // $5.50 (50 × $0.10 + 5 × $0.10)
  },
  'premium-100': {
    name: 'Premium Pack',
    description: '100 Houses + 10 Cars + 5 Trucks',
    price: 4999, // $49.99 in cents
    rewards: {
      house: 100,
      car: 10,
      truck: 5
    },
    creatorPayout: 1150 // $11.50
  },
  'ultimate-jet': {
    name: 'Ultimate Jet',
    description: 'Send the ultimate reward!',
    price: 9999, // $99.99 in cents
    rewards: {
      jet: 1
    },
    creatorPayout: 5000 // $50.00 (higher payout for ultimate reward)
  }
};

// Initialize reward button listeners
document.addEventListener("DOMContentLoaded", () => {
  const rewardButtons = document.querySelectorAll(".select-reward-btn");
  
  rewardButtons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const packageId = e.target.dataset.package;
      const modal = document.getElementById("rewardModal");
      const postId = modal.dataset.postId;
      const creatorUserId = modal.dataset.creatorUserId;
      const creatorUsername = modal.dataset.creatorUsername;
      
      await processRewardPurchase(packageId, postId, creatorUserId, creatorUsername);
    });
  });
});

async function processRewardPurchase(packageId, postId, creatorUserId, creatorUsername) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Please log in to send rewards");
    return;
  }

  if (currentUser.uid === creatorUserId) {
    alert("You cannot send rewards to yourself!");
    return;
  }

  const packageData = REWARD_PACKAGES[packageId];
  if (!packageData) {
    alert("Invalid reward package");
    return;
  }

  // Show loading state
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = "Processing...";
  btn.disabled = true;

  try {
    // In production, you would call your backend to create a Stripe checkout session
    // For now, we'll simulate the payment process
    
    // TODO: Replace with actual Stripe Checkout Session creation
    // const response = await fetch('YOUR_BACKEND_URL/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     packageId,
    //     postId,
    //     creatorUserId,
    //     senderId: currentUser.uid,
    //   })
    // });
    // const session = await response.json();
    // await stripe.redirectToCheckout({ sessionId: session.id });

    // TEMPORARY: Simulate successful payment for development
    const confirmed = confirm(
      `Send ${packageData.description} for $${(packageData.price / 100).toFixed(2)}?\n\n` +
      `Creator ${creatorUsername} will receive $${(packageData.creatorPayout / 100).toFixed(2)}\n\n` +
      `(This is a DEMO - real payments via Stripe coming soon!)`
    );

    if (confirmed) {
      await recordRewardTransaction(packageId, postId, creatorUserId, currentUser.uid, packageData);
      alert(`🎁 Reward sent to ${creatorUsername}!`);
      
      // Close modal
      document.getElementById("rewardModal").style.display = "none";
    }

  } catch (error) {
    console.error("Error processing reward:", error);
    alert("Error processing reward. Please try again.");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function recordRewardTransaction(packageId, postId, creatorUserId, senderId, packageData) {
  const timestamp = serverTimestamp();

  // Update post rewards count
  const postRef = doc(db, "posts", postId);
  const postDoc = await getDoc(postRef);
  const currentRewards = postDoc.data()?.rewards || {};

  const updatedRewards = { ...currentRewards };
  Object.entries(packageData.rewards).forEach(([rewardType, count]) => {
    updatedRewards[rewardType] = (updatedRewards[rewardType] || 0) + count;
  });

  await updateDoc(postRef, {
    rewards: updatedRewards
  });

  // Update creator's rewards data
  const creatorRef = doc(db, "users", creatorUserId);
  const creatorDoc = await getDoc(creatorRef);
  
  if (!creatorDoc.exists()) {
    throw new Error("Creator not found");
  }

  const creatorData = creatorDoc.data();
  const creatorRewards = creatorData.rewards || {
    house: 0,
    car: 0,
    truck: 0,
    miniVan: 0,
    puppy: 0,
    cat: 0,
    grass: 0,
    jet: 0,
    totalEarned: 0,
    pendingPayout: 0,
    lifetimeEarnings: 0
  };

  // Update reward counts
  Object.entries(packageData.rewards).forEach(([rewardType, count]) => {
    creatorRewards[rewardType] = (creatorRewards[rewardType] || 0) + count;
  });

  // Update earnings
  const payoutAmount = packageData.creatorPayout / 100; // Convert cents to dollars
  creatorRewards.totalEarned += payoutAmount;
  creatorRewards.pendingPayout += payoutAmount;
  creatorRewards.lifetimeEarnings += payoutAmount;

  await updateDoc(creatorRef, {
    rewards: creatorRewards,
    lastRewardReceivedAt: timestamp
  });

  // Update sender's supporter data
  const senderRef = doc(db, "users", senderId);
  const senderDoc = await getDoc(senderRef);
  
  if (senderDoc.exists()) {
    const senderData = senderDoc.data();
    const supporterStats = senderData.supporterStats || {
      totalRewardsSent: 0,
      totalSpent: 0,
      creatorsSupported: []
    };

    supporterStats.totalRewardsSent += Object.values(packageData.rewards).reduce((sum, count) => sum + count, 0);
    supporterStats.totalSpent += packageData.price / 100;
    
    if (!supporterStats.creatorsSupported.includes(creatorUserId)) {
      supporterStats.creatorsSupported.push(creatorUserId);
    }

    await updateDoc(senderRef, {
      supporterStats: supporterStats,
      lastRewardSentAt: timestamp
    });
  }

  // TODO: In production, also record transaction in a separate 'transactions' collection
  // for detailed history and tax reporting
}

console.log("🎁 Rewards system initialized");
