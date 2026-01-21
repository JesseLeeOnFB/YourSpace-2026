// feed.js - SUPER SIMPLE VERSION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs,
updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;
import { getAuth, signOut } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;
import { getStorage, ref, uploadBytes, getDownloadURL } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js”;

console.log(“🚀 FEED.JS STARTING…”);

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

console.log(“🔥 Initializing Firebase…”);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
console.log(“✅ Firebase initialized”);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

const postsContainer = document.getElementById(“postsContainer”);
const postBtn = document.getElementById(“postBtn”);
const postText = document.getElementById(“postText”);
const postFileInput = document.getElementById(“postFileInput”);

console.log(“📦 DOM Elements:”, {
postsContainer: !!postsContainer,
postBtn: !!postBtn,
postText: !!postText,
postFileInput: !!postFileInput
});

// Navigation
document.getElementById(“feedNavBtn”)?.addEventListener(“click”, () => window.location.href = “feed.html”);
document.getElementById(“profileNavBtn”)?.addEventListener(“click”, () => window.location.href = “profile.html”);
document.getElementById(“messagesNavBtn”)?.addEventListener(“click”, () => window.location.href = “messages.html”);
document.getElementById(“notificationsNavBtn”)?.addEventListener(“click”, () => window.location.href = “notifications.html”);
document.getElementById(“contactNavBtn”)?.addEventListener(“click”, () => window.location.href = “contact.html”);
document.getElementById(“dashboardNavBtn”)?.addEventListener(“click”, () => window.location.href = “dashboard.html”);
document.getElementById(“adminNavBtn”)?.addEventListener(“click”, () => window.location.href = “admin.html”);
document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

console.log(“✅ Navigation handlers attached”);

// SUPER SIMPLE LOAD POSTS
function loadPosts() {
console.log(“📥 loadPosts() called”);

if (!postsContainer) {
console.error(“❌ postsContainer not found!”);
return;
}

console.log(“📊 Setting up Firestore query…”);
const q = query(collection(db, “posts”), orderBy(“createdAt”, “desc”));

console.log(“👂 Setting up onSnapshot listener…”);
onSnapshot(q,
(snapshot) => {
console.log(“📦 SNAPSHOT RECEIVED!”);
console.log(”   Size:”, snapshot.size);
console.log(”   Empty?”, snapshot.empty);

```
  postsContainer.innerHTML = "";
  
  if (snapshot.empty) {
    console.log("⚠️ No posts in database");
    postsContainer.innerHTML = "<div style='padding:2rem;text-align:center;color:#999;'>No posts yet. Create the first one!</div>";
    return;
  }
  
  console.log("🔄 Processing posts...");
  
  snapshot.forEach((docSnap, index) => {
    console.log(`   Post ${index + 1}/${snapshot.size}:`, docSnap.id);
    
    const post = docSnap.data();
    const postId = docSnap.id;
    
    console.log("   Data:", {
      username: post.username,
      text: post.text?.substring(0, 30),
      userId: post.userId
    });
    
    // Create simple post element
    const postEl = document.createElement("div");
    postEl.className = "post-card";
    postEl.style.border = "1px solid #333";
    postEl.style.padding = "1rem";
    postEl.style.marginBottom = "1rem";
    postEl.style.borderRadius = "8px";
    postEl.style.background = "#1a1a1a";
    
    const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";
    
    postEl.innerHTML = `
      <div style="margin-bottom:0.5rem;">
        <strong style="color:#00ff00;">${post.username || "Anonymous"}</strong>
        <small style="color:#666;margin-left:0.5rem;">${time}</small>
      </div>
      <p style="color:#fff;margin:0.5rem 0;">${post.text || ""}</p>
      ${post.mediaURL ? `<img src="${post.mediaURL}" style="max-width:100%;border-radius:4px;margin-top:0.5rem;" />` : ""}
      <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
        <button class="like-btn" style="padding:0.25rem 0.5rem;background:#00ff00;border:none;border-radius:4px;cursor:pointer;">👍 ${(post.likedBy || []).length}</button>
        <button class="dislike-btn" style="padding:0.25rem 0.5rem;background:#ff0000;border:none;border-radius:4px;cursor:pointer;">👎 ${(post.dislikedBy || []).length}</button>
      </div>
    `;
    
    // Like button
    const likeBtn = postEl.querySelector(".like-btn");
    const currentUserId = auth.currentUser?.uid;
    likeBtn.onclick = async () => {
      console.log("👍 Like clicked:", postId);
      try {
        const postRef = doc(db, "posts", postId);
        const likedBy = post.likedBy || [];
        if (likedBy.includes(currentUserId)) {
          await updateDoc(postRef, { likedBy: arrayRemove(currentUserId) });
        } else {
          await updateDoc(postRef, { likedBy: arrayUnion(currentUserId) });
        }
        console.log("✅ Like updated");
      } catch (err) {
        console.error("❌ Like error:", err);
      }
    };
    
    // Dislike button
    const dislikeBtn = postEl.querySelector(".dislike-btn");
    dislikeBtn.onclick = async () => {
      console.log("👎 Dislike clicked:", postId);
      try {
        const postRef = doc(db, "posts", postId);
        const dislikedBy = post.dislikedBy || [];
        if (dislikedBy.includes(currentUserId)) {
          await updateDoc(postRef, { dislikedBy: arrayRemove(currentUserId) });
        } else {
          await updateDoc(postRef, { dislikedBy: arrayUnion(currentUserId) });
        }
        console.log("✅ Dislike updated");
      } catch (err) {
        console.error("❌ Dislike error:", err);
      }
    };
    
    postsContainer.appendChild(postEl);
    console.log(`   ✅ Post ${index + 1} added to DOM`);
  });
  
  console.log("✅✅✅ ALL POSTS LOADED! Total:", postsContainer.children.length);
  console.log("📍 Posts container has", postsContainer.children.length, "children");
  
},
(error) => {
  console.error("❌❌❌ SNAPSHOT ERROR:", error);
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  postsContainer.innerHTML = `<div style='padding:2rem;color:red;'>ERROR: ${error.message}</div>`;
}
```

);

console.log(“✅ onSnapshot listener attached”);
}

// Create post
if (postBtn) {
postBtn.addEventListener(“click”, async () => {
console.log(“📝 Create post clicked”);

```
const text = postText.value.trim();
const file = postFileInput.files[0];

if (!text && !file) {
  alert("Post cannot be empty");
  return;
}

try {
  console.log("📤 Creating post...");
  
  let mediaURL = "";
  let mediaType = "";
  
  if (file) {
    console.log("📸 Uploading file...");
    mediaType = file.type.startsWith("video") ? "video" : "image";
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
    console.log("✅ File uploaded:", mediaURL);
  }
  
  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];
  
  console.log("💾 Saving to Firestore...");
  await addDoc(collection(db, "posts"), {
    userId: auth.currentUser.uid,
    username,
    text,
    mediaURL,
    mediaType,
    likedBy: [],
    dislikedBy: [],
    pinned: false,
    createdAt: serverTimestamp()
  });
  
  postText.value = "";
  postFileInput.value = "";
  
  console.log("✅✅✅ POST CREATED!");
  
} catch (err) {
  console.error("❌ Create post error:", err);
  alert("Error: " + err.message);
}
```

});

console.log(“✅ Post button handler attached”);
}

// Auth
auth.onAuthStateChanged(async (user) => {
console.log(“🔐 Auth state changed”);
console.log(”   User:”, user ? user.email : “null”);

if (!user) {
console.log(“❌ No user, redirecting to login”);
window.location.href = “login.html”;
return;
}

console.log(“✅ User logged in:”, user.email);

// Show dashboard button
const dashboardBtn = document.getElementById(“dashboardNavBtn”);
if (dashboardBtn) {
dashboardBtn.style.display = “inline-block”;
console.log(“✅ Dashboard button shown”);
}

// Show admin button
if (isAdmin(user.email)) {
const adminBtn = document.getElementById(“adminNavBtn”);
if (adminBtn) {
adminBtn.style.display = “inline-block”;
console.log(“✅ Admin button shown”);
}
}

console.log(“🚀🚀🚀 CALLING LOADPOSTS NOW!”);
loadPosts();
});

// Hamburger menu
const hamburger = document.getElementById(“hamburger”);
const navLinks = document.getElementById(“navLinks”);

if (hamburger && navLinks) {
hamburger.addEventListener(“click”, () => {
hamburger.classList.toggle(“active”);
navLinks.classList.toggle(“active”);
});

navLinks.querySelectorAll(“button”).forEach(button => {
button.addEventListener(“click”, () => {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
});
});

document.addEventListener(“click”, (e) => {
if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
}
});

console.log(“✅ Hamburger menu attached”);
}

// Search
const searchBar = document.getElementById(“searchBar”);
const searchResults = document.getElementById(“searchResults”);
const clearSearchBtn = document.getElementById(“clearSearchBtn”);

if (searchBar && searchResults) {
searchBar.addEventListener(“input”, async (e) => {
const searchTerm = e.target.value.trim().toLowerCase();

```
if (clearSearchBtn) clearSearchBtn.style.display = searchTerm ? "block" : "none";

if (!searchTerm) {
  searchResults.style.display = "none";
  return;
}

try {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const matchedUsers = [];
  
  usersSnapshot.forEach((docSnap) => {
    const userData = docSnap.data();
    const username = userData.username || "";
    if (username.toLowerCase().includes(searchTerm)) {
      matchedUsers.push({ id: docSnap.id, username, photoURL: userData.photoURL });
    }
  });
  
  if (matchedUsers.length > 0) {
    searchResults.style.display = "block";
    searchResults.innerHTML = matchedUsers.map(user => `
      <div class="search-result-item" data-user-id="${user.id}" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid #333;">
        <strong>${user.username}</strong>
      </div>
    `).join("");
    
    searchResults.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        window.location.href = `profile.html?userId=${item.dataset.userId}`;
      });
    });
  } else {
    searchResults.style.display = "block";
    searchResults.innerHTML = "<div style='padding:1rem;color:#666;'>No users found</div>";
  }
} catch (err) {
  console.error("Search error:", err);
}
```

});

console.log(“✅ Search attached”);
}

if (clearSearchBtn) {
clearSearchBtn.addEventListener(“click”, () => {
searchBar.value = “”;
searchResults.style.display = “none”;
clearSearchBtn.style.display = “none”;
});
}

console.log(“✅✅✅ FEED.JS FULLY LOADED!”);
