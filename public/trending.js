// trending.js - Calculate and display trending post every hour

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Scoring weights
const WEIGHTS = {
  like: 1,
  comment: 2,
  reward: 10  // Future: House rewards will have highest weight
};

async function calculateTrendingScore(post, postId, db) {
  const likeCount = (post.likedBy || []).length;
  
  // Count comments
  const commentsSnapshot = await getDocs(collection(db, "posts", postId, "comments"));
  const commentCount = commentsSnapshot.size;
  
  // Calculate score
  const score = (likeCount * WEIGHTS.like) + (commentCount * WEIGHTS.comment);
  
  return score;
}

export async function calculateTrendingPost() {
  try {
    console.log("🔥 Calculating trending post...");
    
    const postsSnapshot = await getDocs(collection(db, "posts"));
    
    let topPost = null;
    let topScore = 0;
    
    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data();
      
      // Skip pinned posts from trending calculation
      if (post.pinned) continue;
      
      // Only consider posts from the last 24 hours
      if (post.createdAt) {
        const postAge = Date.now() - post.createdAt.toMillis();
        const hoursOld = postAge / (1000 * 60 * 60);
        
        if (hoursOld > 24) continue;
      }
      
      const score = await calculateTrendingScore(post, postDoc.id, db);
      
      if (score > topScore) {
        topScore = score;
        topPost = { id: postDoc.id, score };
      }
    }
    
    if (topPost) {
      console.log(`🏆 Trending post: ${topPost.id} with score ${topPost.score}`);
      
      // Clear previous trending posts
      for (const postDoc of postsSnapshot.docs) {
        if (postDoc.data().trending) {
          await updateDoc(doc(db, "posts", postDoc.id), { trending: false });
        }
      }
      
      // Set new trending post
      await updateDoc(doc(db, "posts", topPost.id), { 
        trending: true,
        trendingScore: topPost.score,
        trendingSetAt: new Date().toISOString()
      });
      
      console.log("✅ Trending post updated!");
    } else {
      console.log("ℹ️ No trending post found");
    }
    
  } catch (error) {
    console.error("Error calculating trending post:", error);
  }
}

// Run immediately when loaded
calculateTrendingPost();

// Run every hour
setInterval(() => {
  calculateTrendingPost();
}, 60 * 60 * 1000); // 1 hour in milliseconds

console.log("📊 Trending post calculator initialized - runs every hour");
