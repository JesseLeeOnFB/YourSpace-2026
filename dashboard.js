// dashboard.js - Creator Dashboard

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// Hamburger menu
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

async function loadDashboard() {
  if (!auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  
  // Load user data
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  
  document.getElementById("creatorName").textContent = userData?.username || auth.currentUser.email.split("@")[0];
  document.getElementById("loginStreak").textContent = userData?.loginStreak || 0;
  
  // Load posts stats
  const postsQuery = query(collection(db, "posts"), where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);
  
  let totalLikes = 0;
  let totalComments = 0;
  const posts = [];
  
  for (const docSnap of postsSnapshot.docs) {
    const post = docSnap.data();
    posts.push({ id: docSnap.id, ...post });
    totalLikes += (post.likedBy || []).length;
    
    // Count comments
    const commentsQuery = query(collection(db, "posts", docSnap.id, "comments"));
    const commentsSnapshot = await getDocs(commentsQuery);
    totalComments += commentsSnapshot.size;
  }
  
  document.getElementById("totalPosts").textContent = postsSnapshot.size;
  document.getElementById("totalLikes").textContent = totalLikes;
  document.getElementById("totalComments").textContent = totalComments;
  
  // Load rewards
  const rewards = userData?.rewards || {};
  document.getElementById("houseCount").textContent = rewards.house || 0;
  document.getElementById("carCount").textContent = rewards.car || 0;
  document.getElementById("truckCount").textContent = rewards.truck || 0;
  document.getElementById("petCount").textContent = rewards.pet || 0;
  document.getElementById("diamondCount").textContent = rewards.diamond || 0;
  document.getElementById("crownCount").textContent = rewards.crown || 0;
  
  // Show top posts
  posts.sort((a, b) => ((b.likedBy || []).length) - ((a.likedBy || []).length));
  const topPosts = posts.slice(0, 5);
  
  const topPostsList = document.getElementById("topPostsList");
  topPostsList.innerHTML = "";
  
  if (topPosts.length === 0) {
    topPostsList.innerHTML = "<p style='text-align:center; color:#65676b;'>No posts yet. Create your first post!</p>";
  } else {
    topPosts.forEach(post => {
      const postEl = document.createElement("div");
      postEl.className = "top-post-item";
      postEl.innerHTML = `
        <div class="top-post-text">${post.text?.substring(0, 100) || 'Post with media'}...</div>
        <div class="top-post-stats">
          <span>👍 ${(post.likedBy || []).length}</span>
          <span>💬 ${post.commentCount || 0}</span>
        </div>
      `;
      topPostsList.appendChild(postEl);
    });
  }
  
  // Engagement bars (last 7 days)
  const maxValue = Math.max(totalLikes, totalComments, 0);
  const likesPercent = maxValue > 0 ? (totalLikes / maxValue) * 100 : 0;
  const commentsPercent = maxValue > 0 ? (totalComments / maxValue) * 100 : 0;
  
  document.getElementById("likesBar").style.width = likesPercent + "%";
  document.getElementById("commentsBar").style.width = commentsPercent + "%";
  document.getElementById("sharesBar").style.width = "0%";
  
  document.getElementById("likesValue").textContent = totalLikes;
  document.getElementById("commentsValue").textContent = totalComments;
  document.getElementById("sharesValue").textContent = 0;
  
  // Add reward click animations
  document.querySelectorAll(".reward-item").forEach(item => {
    item.addEventListener("click", () => {
      item.classList.add("active");
      setTimeout(() => {
        item.classList.remove("active");
      }, 1000);
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show admin button if user is admin
    if (isAdmin(user.email)) {
      document.getElementById("adminNavBtn").style.display = "inline-block";
    }
    
    await loadDashboard();
  }
});
