// feed.js - COMPLETE WORKING VERSION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs, where,
updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;
import { getAuth, signOut } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;
import { getStorage, ref, uploadBytes, getDownloadURL } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Rate limiting
const postTimestamps = [];
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW = 2 * 60 * 1000;

function checkRateLimit() {
const now = Date.now();
while (postTimestamps.length > 0 && now - postTimestamps[0] > RATE_LIMIT_WINDOW) {
postTimestamps.shift();
}

if (postTimestamps.length >= RATE_LIMIT_COUNT) {
const oldestPost = postTimestamps[0];
const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestPost)) / 1000);
alert(`⏱️ Slow down! You can post again in ${waitTime} seconds.`);
return false;
}

postTimestamps.push(now);
return true;
}

// Spam filter
const BLOCKED_KEYWORDS = {
racial: [‘nigger’, ‘nigga’, ‘coon’, ‘spic’, ‘chink’],
suicide: [‘kill myself’, ‘suicide’, ‘kys’],
threats: [‘kill you’, ‘murder you’, ‘bomb’],
selfHarm: [‘cut myself’, ‘harm myself’]
};

function containsBlockedKeyword(text) {
if (!text) return { blocked: false };
const lowerText = text.toLowerCase();

for (const category in BLOCKED_KEYWORDS) {
for (const keyword of BLOCKED_KEYWORDS[category]) {
if (lowerText.includes(keyword)) {
return { blocked: true, category };
}
}
}
return { blocked: false };
}

const postsContainer = document.getElementById(“postsContainer”);
const postBtn = document.getElementById(“postBtn”);
const postText = document.getElementById(“postText”);
const postFileInput = document.getElementById(“postFileInput”);

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

// Render post
function renderPost(post, postId) {
console.log(“🎨 Rendering post:”, postId);

try {
const currentUserId = auth.currentUser.uid;
const currentUserEmail = auth.currentUser.email;
const isOwner = post.userId === currentUserId;

```
const likedBy = post.likedBy || [];
const dislikedBy = post.dislikedBy || [];
const userLiked = likedBy.includes(currentUserId);
const userDisliked = dislikedBy.includes(currentUserId);
const isPinned = post.pinned || false;

const postEl = document.createElement("div");
postEl.className = "post-card";
if (isPinned) postEl.classList.add("pinned-post");

const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";

postEl.innerHTML = `
  ${isPinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
  <div class="post-header">
    <strong>${post.username || "Anonymous"}</strong>
    <small>${time}</small>
  </div>
  <p>${post.text || ""}</p>
  ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
  <div class="actions">
    <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
    <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button>
    <button class="comment-toggle" data-id="${postId}">💬</button>
    <button class="share-btn" data-id="${postId}">🔗</button>
    ${isOwner ? `<button class="edit-btn" data-id="${postId}">✏️</button>` : ""}
    ${isOwner ? `<button class="delete-btn" data-id="${postId}">🗑️</button>` : ""}
    ${isAdmin(currentUserEmail) && !isPinned ? `<button class="pin-btn" data-id="${postId}">📌 Pin</button>` : ""}
    ${isAdmin(currentUserEmail) && isPinned ? `<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>` : ""}
  </div>
  <div class="comments-section" id="comments-${postId}" style="display:none;"></div>
  <div class="comment-form">
    <input type="text" class="comment-input" placeholder="Write a comment..." />
    <button class="comment-btn" data-id="${postId}">💬</button>
  </div>
`;

// Like button
postEl.querySelector(".like-btn").onclick = async () => {
  const postRef = doc(db, "posts", postId);
  if (userLiked) {
    await updateDoc(postRef, { likedBy: arrayRemove(currentUserId) });
  } else {
    const updates = { likedBy: arrayUnion(currentUserId) };
    if (userDisliked) updates.dislikedBy = arrayRemove(currentUserId);
    await updateDoc(postRef, updates);
  }
};

// Dislike button
postEl.querySelector(".dislike-btn").onclick = async () => {
  const postRef = doc(db, "posts", postId);
  if (userDisliked) {
    await updateDoc(postRef, { dislikedBy: arrayRemove(currentUserId) });
  } else {
    const updates = { dislikedBy: arrayUnion(currentUserId) };
    if (userLiked) updates.likedBy = arrayRemove(currentUserId);
    await updateDoc(postRef, updates);
  }
};

// Share button
postEl.querySelector(".share-btn").onclick = () => {
  navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
  alert("Post link copied!");
};

// Edit button
const editBtn = postEl.querySelector(".edit-btn");
if (editBtn) {
  editBtn.onclick = async () => {
    const newText = prompt("Edit your post:", post.text);
    if (newText && newText.trim() !== post.text) {
      await updateDoc(doc(db, "posts", postId), {
        text: newText.trim(),
        edited: true,
        editedAt: serverTimestamp()
      });
    }
  };
}

// Delete button
const deleteBtn = postEl.querySelector(".delete-btn");
if (deleteBtn) {
  deleteBtn.onclick = async () => {
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", postId));
      postEl.remove();
    }
  };
}

// Pin/Unpin buttons
const pinBtn = postEl.querySelector(".pin-btn");
if (pinBtn) {
  pinBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { pinned: true });
    alert("Post pinned!");
  };
}

const unpinBtn = postEl.querySelector(".unpin-btn");
if (unpinBtn) {
  unpinBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { pinned: false });
  };
}

// Comment toggle
const commentToggle = postEl.querySelector(".comment-toggle");
const commentsSection = postEl.querySelector(".comments-section");
commentToggle.onclick = () => {
  commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
};

// Load comments
const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
onSnapshot(commentsQ, (snap) => {
  commentsSection.innerHTML = "";
  snap.forEach((commentDoc) => {
    const comment = commentDoc.data();
    const commentEl = document.createElement("div");
    commentEl.className = "comment";
    commentEl.innerHTML = `
      <strong>${comment.username || "Anonymous"}</strong>
      <p>${comment.text}</p>
    `;
    
    if (comment.userId === currentUserId) {
      const deleteCommentBtn = document.createElement("button");
      deleteCommentBtn.className = "delete-comment";
      deleteCommentBtn.textContent = "🗑️";
      deleteCommentBtn.onclick = async () => {
        if (confirm("Delete this comment?")) {
          await deleteDoc(doc(db, "posts", postId, "comments", commentDoc.id));
        }
      };
      commentEl.appendChild(deleteCommentBtn);
    }
    
    commentsSection.appendChild(commentEl);
  });
});

// Add comment
postEl.querySelector(".comment-btn").onclick = async () => {
  const input = postEl.querySelector(".comment-input");
  const text = input.value.trim();
  if (!text) return alert("Comment cannot be empty");
  
  const userDoc = await getDoc(doc(db, "users", currentUserId));
  const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];
  
  await addDoc(collection(db, "posts", postId, "comments"), {
    userId: currentUserId,
    username,
    text,
    createdAt: serverTimestamp()
  });
  
  input.value = "";
};

console.log("✅ Post rendered successfully:", postId);
return postEl;
```

} catch (err) {
console.error(“❌ Error rendering post:”, postId, err);
return null;
}
}

// Load posts
function loadPosts() {
console.log(“📥 Starting loadPosts…”);

const q = query(collection(db, “posts”), orderBy(“createdAt”, “desc”));

onSnapshot(q, async (snapshot) => {
console.log(“📊 Got snapshot with”, snapshot.size, “posts”);

```
postsContainer.innerHTML = "";

if (snapshot.empty) {
  console.log("⚠️ No posts in database");
  postsContainer.innerHTML = "<p style='text-align:center;color:#999;padding:2rem;'>No posts yet!</p>";
  return;
}

const posts = [];
snapshot.forEach((docSnap) => {
  posts.push({ id: docSnap.id, data: docSnap.data() });
});

console.log("📝 Processing", posts.length, "posts");

// Sort: pinned first
posts.sort((a, b) => {
  if (a.data.pinned && !b.data.pinned) return -1;
  if (!a.data.pinned && b.data.pinned) return 1;
  return 0;
});

for (const { id, data } of posts) {
  try {
    console.log("🔄 Rendering post:", id);
    const postEl = renderPost(data, id);
    if (postEl) {
      postsContainer.appendChild(postEl);
      console.log("✅ Appended post:", id);
    } else {
      console.log("⚠️ renderPost returned null for:", id);
    }
  } catch (err) {
    console.error("❌ Error with post:", id, err);
  }
}

console.log("✅ Feed loaded! Total posts displayed:", postsContainer.children.length);
```

}, (error) => {
console.error(“❌ Snapshot error:”, error);
});
}

// Create post
postBtn.addEventListener(“click”, async () => {
console.log(“📝 Creating post…”);

const text = postText.value.trim();
const file = postFileInput.files[0];

if (!text && !file) return alert(“Post cannot be empty”);

const spamCheck = containsBlockedKeyword(text);
if (spamCheck.blocked) {
alert(“⛔ This content violates our community guidelines.”);
return;
}

if (!checkRateLimit()) return;

try {
let mediaURL = “”;
let mediaType = “”;

```
if (file) {
  mediaType = file.type.startsWith("video") ? "video" : "image";
  const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  mediaURL = await getDownloadURL(storageRef);
}

const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];

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

console.log("✅ Post created successfully");
```

} catch (err) {
console.error(“❌ Error creating post:”, err);
alert(“Error creating post: “ + err.message);
}
});

// Login streak
async function updateLoginStreak(userId) {
try {
const userRef = doc(db, “users”, userId);
const userDoc = await getDoc(userRef);

```
if (!userDoc.exists()) return;

const userData = userDoc.data();
const today = new Date().toDateString();
const lastLogin = userData.lastLoginDate;
const currentStreak = userData.loginStreak || 0;

if (lastLogin === today) return;

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toDateString();

let newStreak = 1;

if (lastLogin === yesterdayStr) {
  newStreak = currentStreak + 1;
  
  if (newStreak % 7 === 0) {
    setTimeout(() => alert(`🔥 ${newStreak} DAY STREAK!`), 1000);
  } else if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
    setTimeout(() => alert(`✨ ${newStreak} day streak!`), 1000);
  }
}

await updateDoc(userRef, {
  lastLoginDate: today,
  loginStreak: newStreak,
  totalLogins: (userData.totalLogins || 0) + 1
});
```

} catch (err) {
console.error(“Error updating login streak:”, err);
}
}

// Auth
auth.onAuthStateChanged(async (user) => {
console.log(“🔐 Auth state changed:”, user ? “Logged in” : “Logged out”);

if (!user) {
window.location.href = “login.html”;
} else {
const dashboardBtn = document.getElementById(“dashboardNavBtn”);
if (dashboardBtn) dashboardBtn.style.display = “inline-block”;

```
if (isAdmin(user.email)) {
  const adminBtn = document.getElementById("adminNavBtn");
  if (adminBtn) adminBtn.style.display = "inline-block";
}

await updateLoginStreak(user.uid);

console.log("🚀 Calling loadPosts...");
loadPosts();
```

}
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
}

// User search
const searchBar = document.getElementById(“searchBar”);
const searchResults = document.getElementById(“searchResults”);
const clearSearchBtn = document.getElementById(“clearSearchBtn”);

if (searchBar && searchResults) {
searchBar.addEventListener(“input”, async (e) => {
const searchTerm = e.target.value.trim().toLowerCase();

```
if (clearSearchBtn) {
  clearSearchBtn.style.display = searchTerm ? "block" : "none";
}

if (!searchTerm) {
  searchResults.style.display = "none";
  searchResults.innerHTML = "";
  return;
}

try {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const matchedUsers = [];
  
  usersSnapshot.forEach((docSnap) => {
    const userData = docSnap.data();
    const username = userData.username || "";
    if (username.toLowerCase().includes(searchTerm)) {
      matchedUsers.push({
        id: docSnap.id,
        username,
        photoURL: userData.photoURL || "https://via.placeholder.com/50"
      });
    }
  });
  
  if (matchedUsers.length > 0) {
    searchResults.style.display = "block";
    searchResults.innerHTML = matchedUsers.map(user => `
      <div class="search-result-item" data-user-id="${user.id}">
        <img src="${user.photoURL}" alt="${user.username}" class="search-result-avatar">
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
    searchResults.innerHTML = "<div class='no-results'>No users found</div>";
  }
} catch (err) {
  console.error("Search error:", err);
}
```

});

document.addEventListener(“click”, (e) => {
if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
searchResults.style.display = “none”;
}
});
}

if (clearSearchBtn) {
clearSearchBtn.addEventListener(“click”, () => {
searchBar.value = “”;
searchResults.style.display = “none”;
searchResults.innerHTML = “”;
clearSearchBtn.style.display = “none”;
searchBar.focus();
});
}

console.log(“✅ Feed.js loaded successfully”);
