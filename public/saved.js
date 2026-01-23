// saved.js - Saved Posts Page
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, updateDoc, arrayRemove, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileNavBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("messagesNavBtn")?.addEventListener("click", () => window.location.href = "messages.html");
document.getElementById("dashboardNavBtn")?.addEventListener("click", () => window.location.href = "dashboard.html");
document.getElementById("adminNavBtn")?.addEventListener("click", () => window.location.href = "admin.html");
document.getElementById("contactNavBtn")?.addEventListener("click", () => window.location.href = "contact.html");
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

async function loadSavedPosts() {
  const savedPostsContainer = document.getElementById("savedPostsContainer");
  savedPostsContainer.innerHTML = "<p style='text-align:center; color:#65676b; padding:2rem;'>Loading saved posts...</p>";
  
  try {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userDoc.data();
    const savedPostIds = userData?.savedPosts || [];
    
    if (savedPostIds.length === 0) {
      savedPostsContainer.innerHTML = "<p style='text-align:center; color:#65676b; padding:2rem;'>You haven't saved any posts yet. Click the 🔖 button on posts you want to save!</p>";
      return;
    }
    
    savedPostsContainer.innerHTML = "";
    
    for (const postId of savedPostIds) {
      const postDoc = await getDoc(doc(db, "posts", postId));
      
      if (!postDoc.exists()) continue;
      
      const post = postDoc.data();
      const postEl = document.createElement("div");
      postEl.className = "post-card";
      
      const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";
      
      postEl.innerHTML = `
        <div class="post-header">
          <strong>${post.username || "Anonymous"}</strong>
          <small>${time}</small>
        </div>
        <p>${post.text || ""}</p>
        ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
        <div class="actions">
          <button class="like-btn">👍 ${(post.likedBy || []).length}</button>
          <button class="dislike-btn">🖕 ${(post.dislikedBy || []).length}</button>
          <a href="feed.html#post-${postId}" style="text-decoration:none;"><button>💬 View Comments</button></a>
          <button class="unsave-btn" data-id="${postId}">❌ Remove</button>
        </div>
      `;
      
      postEl.querySelector(".unsave-btn").addEventListener("click", async () => {
        if (confirm("Remove this post from saved?")) {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            savedPosts: arrayRemove(postId)
          });
          await updateDoc(doc(db, "posts", postId), {
            savedBy: arrayRemove(auth.currentUser.uid)
          });
          loadSavedPosts();
        }
      });
      
      savedPostsContainer.appendChild(postEl);
    }
  } catch (err) {
    console.error("Error loading saved posts:", err);
    savedPostsContainer.innerHTML = "<p style='text-align:center; color:#ff4444; padding:2rem;'>Error loading saved posts. Please try again.</p>";
  }
}

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    if (document.getElementById("dashboardNavBtn")) {
      document.getElementById("dashboardNavBtn").style.display = "inline-block";
    }
    if (isAdmin(user.email) && document.getElementById("adminNavBtn")) {
      document.getElementById("adminNavBtn").style.display = "inline-block";
    }
    loadSavedPosts();
  }
});
