// feed.js - COMPLETE VERSION

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs, where,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Rate limiting
const postTimestamps = [];
function checkRateLimit() {
  const now = Date.now();
  while (postTimestamps.length > 0 && now - postTimestamps[0] > 120000) postTimestamps.shift();
  if (postTimestamps.length >= 5) {
    alert(`⏱️ Slow down! Wait ${Math.ceil((120000 - (now - postTimestamps[0])) / 1000)} seconds.`);
    return false;
  }
  postTimestamps.push(now);
  return true;
}

// Spam filter
const BLOCKED_KEYWORDS = {
  racial: ['nigger', 'nigga', 'coon', 'spic', 'chink', 'faggot', 'fag', 'retard'],
  suicide: ['kill myself', 'suicide', 'kys'],
  threats: ['kill you', 'murder you', 'bomb'],
  selfHarm: ['cut myself', 'harm myself']
};

function containsBlockedKeyword(text) {
  if (!text) return { blocked: false };
  const lower = text.toLowerCase();
  for (const cat in BLOCKED_KEYWORDS) {
    for (const word of BLOCKED_KEYWORDS[cat]) {
      if (lower.includes(word)) return { blocked: true, category: cat };
    }
  }
  return { blocked: false };
}

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// Navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileNavBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("messagesNavBtn")?.addEventListener("click", () => window.location.href = "messages.html");
document.getElementById("notificationsNavBtn")?.addEventListener("click", () => window.location.href = "notifications.html");
document.getElementById("contactNavBtn")?.addEventListener("click", () => window.location.href = "contact.html");
document.getElementById("dashboardNavBtn")?.addEventListener("click", () => window.location.href = "dashboard.html");
document.getElementById("adminNavBtn")?.addEventListener("click", () => window.location.href = "admin.html");
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// Gift system
const GIFT_TYPES = {
  rose: { name: "Rose", icon: "🌹", price: 1.99 },
  coffee: { name: "Coffee", icon: "☕", price: 4.99 },
  bear: { name: "Teddy Bear", icon: "🧸", price: 9.99 },
  cake: { name: "Cake", icon: "🍰", price: 14.99 },
  diamond: { name: "Diamond", icon: "💎", price: 49.99 },
  yacht: { name: "Yacht", icon: "🛥️", price: 99.99 }
};

function showGiftDialog(postId, recipientUserId, recipientUsername) {
  const dialog = document.createElement('div');
  dialog.className = 'gift-dialog-overlay';
  dialog.innerHTML = `
    <div class="gift-dialog">
      <h3>🎁 Send Gift to ${recipientUsername}</h3>
      <p>Show appreciation!</p>
      <div class="gift-options"></div>
      <button class="gift-cancel-btn">Cancel</button>
    </div>
  `;
  
  const container = dialog.querySelector('.gift-options');
  Object.entries(GIFT_TYPES).forEach(([type, { name, icon, price }]) => {
    const opt = document.createElement('div');
    opt.className = 'gift-option';
    opt.innerHTML = `<div class="gift-icon">${icon}</div><span class="gift-name">${name}</span><span class="gift-price">$${price.toFixed(2)}</span>`;
    opt.onclick = () => sendGift(postId, recipientUserId, type, price);
    container.appendChild(opt);
  });
  
  dialog.querySelector('.gift-cancel-btn').onclick = () => dialog.remove();
  dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
  document.body.appendChild(dialog);
}

async function sendGift(postId, recipientUserId, giftType, price) {
  try {
    await addDoc(collection(db, "gifts"), {
      fromUserId: auth.currentUser.uid,
      toUserId: recipientUserId,
      postId,
      giftType,
      amount: price,
      createdAt: serverTimestamp()
    });
    const recipientRef = doc(db, "users", recipientUserId);
    const recipientDoc = await getDoc(recipientRef);
    await updateDoc(recipientRef, {
      totalEarnings: (recipientDoc.data().totalEarnings || 0) + price
    });
    alert(`🎁 Gift sent! ${GIFT_TYPES[giftType].icon}`);
    document.querySelector('.gift-dialog-overlay')?.remove();
  } catch (err) {
    alert("Error sending gift");
  }
}

async function createNotification(toUserId, fromUserId, message, postId = null) {
  if (toUserId === fromUserId) return;
  try {
    const fromUserDoc = await getDoc(doc(db, "users", fromUserId));
    const fromUserData = fromUserDoc.data();
    await addDoc(collection(db, "users", toUserId, "notifications"), {
      fromUserId,
      fromUsername: fromUserData?.username || "Someone",
      fromUserAvatar: fromUserData?.photoURL || "",
      message,
      postId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {}
}

// RENDER POST
function renderPost(post, postId) {
  const currentUserId = auth.currentUser.uid;
  const currentUserEmail = auth.currentUser.email;
  const isOwner = post.userId === currentUserId;
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
    <p>${post.text || ""}${post.edited ? ' <span class="edited-badge">(edited)</span>' : ""}</p>
    ${post.mediaURL ? (post.mediaType === "video" ? `<video controls src="${post.mediaURL}" class="post-media"></video>` : `<img src="${post.mediaURL}" class="post-media" />`) : ""}
    <div class="actions">
      <button class="like-btn ${userLiked ? 'active' : ''}">${userLiked ? '❤️' : '👍'} ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}">${userDisliked ? '💔' : '👎'} ${dislikedBy.length}</button>
      <button class="comment-toggle">💬</button>
      ${!isOwner ? `<button class="gift-btn">🎁</button>` : ""}
      <button class="share-btn">🔗</button>
      ${isOwner ? `<button class="edit-btn">✏️</button>` : ""}
      ${isOwner ? `<button class="delete-btn">🗑️</button>` : ""}
      ${isAdmin(currentUserEmail) && !isPinned ? `<button class="pin-btn">📌</button>` : ""}
      ${isAdmin(currentUserEmail) && isPinned ? `<button class="unpin-btn">📍</button>` : ""}
    </div>
    <div class="comments-section" style="display:none;"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="Comment..." />
      <button class="comment-btn">💬</button>
    </div>
  `;
  
  // Like
  postEl.querySelector(".like-btn").onclick = async () => {
    const postRef = doc(db, "posts", postId);
    if (userLiked) {
      await updateDoc(postRef, { likedBy: arrayRemove(currentUserId) });
    } else {
      const updates = { likedBy: arrayUnion(currentUserId) };
      if (userDisliked) updates.dislikedBy = arrayRemove(currentUserId);
      await updateDoc(postRef, updates);
      if (post.userId !== currentUserId) await createNotification(post.userId, currentUserId, "liked your post", postId);
    }
  };
  
  // Dislike
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
  
  // Share
  postEl.querySelector(".share-btn").onclick = () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Link copied!");
  };
  
  // Gift
  const giftBtn = postEl.querySelector(".gift-btn");
  if (giftBtn) {
    giftBtn.onclick = async () => {
      const recipientDoc = await getDoc(doc(db, "users", post.userId));
      const data = recipientDoc.data();
      if (!data.stripeVerified || !data.stripeTaxComplete) {
        alert("⚠️ User hasn't completed payment setup!");
        return;
      }
      showGiftDialog(postId, post.userId, post.username);
    };
  }
  
  // Edit
  const editBtn = postEl.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.onclick = async () => {
      const newText = prompt("Edit:", post.text);
      if (newText && newText.trim() !== post.text) {
        await updateDoc(doc(db, "posts", postId), {
          text: newText.trim(),
          edited: true,
          editedAt: serverTimestamp()
        });
      }
    };
  }
  
  // Delete
  const deleteBtn = postEl.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm("Delete post?")) await deleteDoc(doc(db, "posts", postId));
    };
  }
  
  // Pin/Unpin
  const pinBtn = postEl.querySelector(".pin-btn");
  if (pinBtn) {
    pinBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { pinned: true });
    };
  }
  const unpinBtn = postEl.querySelector(".unpin-btn");
  if (unpinBtn) {
    unpinBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { pinned: false });
    };
  }
  
  // Comments
  const commentsSection = postEl.querySelector(".comments-section");
  const commentToggle = postEl.querySelector(".comment-toggle");
  commentToggle.onclick = () => {
    commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
  };
  
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
  onSnapshot(commentsQ, (snap) => {
    commentsSection.innerHTML = "";
    snap.forEach((commentDoc) => {
      const comment = commentDoc.data();
      const commentEl = document.createElement("div");
      commentEl.className = "comment";
      const commentTime = comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleString() : "now";
      commentEl.innerHTML = `<strong>${comment.username || "Anonymous"}</strong><p>${comment.text}</p><small>${commentTime}</small>`;
      if (comment.userId === currentUserId) {
        const delBtn = document.createElement("button");
        delBtn.className = "delete-comment";
        delBtn.textContent = "🗑️";
        delBtn.onclick = async () => {
          if (confirm("Delete comment?")) await deleteDoc(doc(db, "posts", postId, "comments", commentDoc.id));
        };
        commentEl.appendChild(delBtn);
      }
      commentsSection.appendChild(commentEl);
    });
  });
  
  // Add comment
  postEl.querySelector(".comment-btn").onclick = async () => {
    const input = postEl.querySelector(".comment-input");
    const text = input.value.trim();
    if (!text) return;
    const userDoc = await getDoc(doc(db, "users", currentUserId));
    const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];
    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: currentUserId,
      username,
      text,
      createdAt: serverTimestamp()
    });
    input.value = "";
    if (post.userId !== currentUserId) await createNotification(post.userId, currentUserId, "commented on your post", postId);
  };
  
  return postEl;
}

// LOAD POSTS
function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    if (snapshot.empty) {
      postsContainer.innerHTML = "<p style='text-align:center;color:#999;padding:2rem;'>No posts yet!</p>";
      return;
    }
    const posts = [];
    snapshot.forEach((d) => posts.push({ id: d.id, data: d.data() }));
    posts.sort((a, b) => (a.data.pinned && !b.data.pinned) ? -1 : (!a.data.pinned && b.data.pinned) ? 1 : 0);
    posts.forEach(({ id, data }) => {
      const postEl = renderPost(data, id);
      if (postEl) postsContainer.appendChild(postEl);
    });
  });
}

// CREATE POST
if (postBtn) {
  postBtn.addEventListener("click", async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];
    if (!text && !file) return alert("Post cannot be empty");
    const check = containsBlockedKeyword(text);
    if (check.blocked) return alert("⛔ Content violates guidelines");
    if (!checkRateLimit()) return;
    
    try {
      let mediaURL = "";
      let mediaType = "";
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
    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}

// Login streak
async function updateLoginStreak(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;
    const userData = userDoc.data();
    const today = new Date().toDateString();
    if (userData.lastLoginDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = 1;
    if (userData.lastLoginDate === yesterday.toDateString()) {
      newStreak = (userData.loginStreak || 0) + 1;
      if (newStreak % 7 === 0) setTimeout(() => alert(`🔥 ${newStreak} DAY STREAK!`), 1000);
    }
    await updateDoc(userRef, {
      lastLoginDate: today,
      loginStreak: newStreak,
      totalLogins: (userData.totalLogins || 0) + 1
    });
  } catch (err) {}
}

// Auth
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const dashboardBtn = document.getElementById("dashboardNavBtn");
    if (dashboardBtn) dashboardBtn.style.display = "inline-block";
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) adminBtn.style.display = "inline-block";
    }
    await updateLoginStreak(user.uid);
    loadPosts();
  }
});

// Hamburger
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
  navLinks.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    });
  });
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    }
  });
}

// Search
const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
const clearSearchBtn = document.getElementById("clearSearchBtn");
if (searchBar && searchResults) {
  searchBar.addEventListener("input", async (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (clearSearchBtn) clearSearchBtn.style.display = term ? "block" : "none";
    if (!term) {
      searchResults.style.display = "none";
      return;
    }
    const usersSnap = await getDocs(collection(db, "users"));
    const matched = [];
    usersSnap.forEach((d) => {
      const u = d.data();
      if ((u.username || "").toLowerCase().includes(term)) {
        matched.push({ id: d.id, username: u.username, photo: u.photoURL });
      }
    });
    if (matched.length > 0) {
      searchResults.style.display = "block";
      searchResults.innerHTML = matched.map(u => `
        <div class="search-result-item" data-user-id="${u.id}">
          <img src="${u.photo || 'https://via.placeholder.com/50'}" class="search-result-avatar" />
          <strong>${u.username}</strong>
        </div>
      `).join("");
      searchResults.querySelectorAll(".search-result-item").forEach(item => {
        item.onclick = () => window.location.href = `profile.html?userId=${item.dataset.userId}`;
      });
    } else {
      searchResults.style.display = "block";
      searchResults.innerHTML = "<div class='no-results'>No users found</div>";
    }
  });
  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    searchBar.value = "";
    searchResults.style.display = "none";
    clearSearchBtn.style.display = "none";
  });
}
