// feed.js — FIXED - Posts now display properly!

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

// Admin accounts
const ADMIN_EMAILS = [
“skeeterjeeter8@gmail.com”,
“daniellehunt01@gmail.com”
];

// ═══════════════════════════════════════════════════════════
// SPAM RATE LIMIT - 5 posts per 2 minutes
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// SPAM & CONTENT FILTER
// ═══════════════════════════════════════════════════════════

const BLOCKED_KEYWORDS = {
racial: [
‘nigger’, ‘nigga’, ‘n1gger’, ‘n1gga’, ‘nig’, ‘coon’, ‘c00n’, ‘spic’, ‘sp1c’,
‘chink’, ‘ch1nk’, ‘gook’, ‘g00k’, ‘wetback’, ‘beaner’, ‘kike’, ‘k1ke’,
‘towelhead’, ‘raghead’, ‘sand nigger’, ‘paki’, ‘porch monkey’,
‘faggot’, ‘fag’, ‘f4ggot’, ‘tranny’, ‘tr4nny’, ‘shemale’, ‘dyke’,
‘retard’, ‘ret4rd’, ‘r3tard’, ‘retarded’
],
suicide: [
‘kill myself’, ‘suicide’, ‘end my life’, ‘want to die’, ‘going to die’,
‘gonna kill myself’, ‘wanna die’, ‘better off dead’, ‘suicide note’,
‘killing myself’, ‘hang myself’, ‘shoot myself’, ‘overdose’, ‘slit my wrists’,
‘jump off’, ‘end it all’, ‘no reason to live’, ‘don't want to live’, ‘kys’, ‘k y s’
],
threats: [
‘kill you’, ‘murder you’, ‘shoot you’, ‘stab you’, ‘hurt you’,
‘find you’, ‘come after you’, ‘beat you’, ‘attack you’, ‘rape you’,
‘bomb’, ‘shooting’, ‘school shooter’, ‘mass shooting’, ‘terrorist attack’,
‘going to kill’, ‘gonna kill’, ‘planning to kill’, ‘deserve to die’,
‘i will kill’, ‘im going to kill’, ‘youre dead’, ‘ur dead’,
‘blow up’, ‘detonate’, ‘bomb threat’, ‘sexually assault’
],
selfHarm: [
‘cut myself’, ‘cutting myself’, ‘self harm’, ‘harm myself’, ‘hurt myself’,
‘burn myself’, ‘starve myself’, ‘punish myself’
],
sexual: [
‘send nudes’, ‘dick pic’, ‘show me your’, ‘send pics’
],
doxxing: [
‘your address is’, ‘you live at’, ‘phone number is’, ‘social security’
]
};

function containsBlockedKeyword(text) {
if (!text || typeof text !== ‘string’) return { blocked: false };

const lowerText = text.toLowerCase();

for (const category in BLOCKED_KEYWORDS) {
for (const keyword of BLOCKED_KEYWORDS[category]) {
if (lowerText.includes(keyword)) {
return { blocked: true, category: category, keyword: keyword };
}
}
}

const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
if (text.length > 10 && capsRatio > 0.7) {
return { blocked: true, category: ‘spam’, keyword: ‘excessive caps’ };
}

const specialChars = (text.match(/[!@#$%^&*()]/g) || []).length;
if (specialChars > text.length * 0.3) {
return { blocked: true, category: ‘spam’, keyword: ‘excessive special characters’ };
}

return { blocked: false };
}

function getBlockedMessage(category) {
const messages = {
racial: “⛔ This content contains hate speech and cannot be posted.”,
suicide: “❤️ We’re concerned about you. If you’re having thoughts of suicide, please reach out: 988 Suicide & Crisis Lifeline.”,
threats: “🚨 Threats of violence are not allowed.”,
selfHarm: “💚 We care about your wellbeing. Please get help: 988 Suicide & Crisis Lifeline.”,
sexual: “⛔ Sexual harassment is not allowed.”,
doxxing: “⛔ Sharing personal information is not allowed.”,
spam: “⛔ Your message appears to be spam.”
};
return messages[category] || “⛔ This content violates our community guidelines.”;
}

function isAdmin(email) {
return ADMIN_EMAILS.includes(email.toLowerCase());
}

function haptic(type = “light”) {
if (!navigator.vibrate) return;
if (type === “light”) navigator.vibrate(10);
if (type === “medium”) navigator.vibrate(20);
if (type === “heavy”) navigator.vibrate([30, 20, 30]);
}

const postsContainer = document.getElementById(“postsContainer”);
const postBtn = document.getElementById(“postBtn”);
const postText = document.getElementById(“postText”);
const postFileInput = document.getElementById(“postFileInput”);

// Navigation
document.getElementById(“feedNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “feed.html”;
});

document.getElementById(“profileNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “profile.html”;
});

document.getElementById(“messagesNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “messages.html”;
});

document.getElementById(“notificationsNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “notifications.html”;
});

document.getElementById(“contactNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “contact.html”;
});

document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

document.getElementById(“dashboardNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “dashboard.html”;
});

document.getElementById(“adminNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “admin.html”;
});

// ═══════════════════════════════════════════════════════════
// RENDER POST FUNCTION
// ═══════════════════════════════════════════════════════════
async function renderPost(post, postId) {
const isOwner = post.userId === auth.currentUser.uid;
const currentUserId = auth.currentUser.uid;
const currentUserEmail = auth.currentUser.email;

const likedBy = post.likedBy || [];
const dislikedBy = post.dislikedBy || [];
const userLiked = likedBy.includes(currentUserId);
const userDisliked = dislikedBy.includes(currentUserId);
const isPinned = post.pinned || false;
const isTrending = post.trending || false;

const postEl = document.createElement(“div”);
postEl.className = “post-card”;
if (isPinned) postEl.classList.add(“pinned-post”);
if (isTrending) postEl.classList.add(“trending-post”);

const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : “just now”;

postEl.innerHTML = `${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''} ${isTrending && !isPinned ? '<div class="trending-badge">🔥 Trending Now</div>' : ''} <div class="post-header"> <strong>${post.username || "Anonymous"}</strong> <small>${time}</small> </div> <p>${post.text || ""}${post.edited ? ' <span class="edited-badge">(edited)</span>' : ""}</p> ${post.mediaURL ?`<${post.mediaType === “video” ? “video controls” : “img”} src=”${post.mediaURL}” class=“post-media” />`: ""} <div class="actions"> <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button> <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button> <button class="comment-toggle" data-id="${postId}">💬</button> ${!isOwner ?`<button class="gift-btn" data-id="${postId}" data-userid="${post.userId}">🎁 Send Gift</button>`: ""} <button class="share-btn" data-id="${postId}">🔗</button> ${!isOwner ?`<button class="report-post-btn" data-id="${postId}" data-type="post">🚨 Report</button>`: ""} ${isOwner ?`<button class="edit-btn" data-id="${postId}">✏️ Edit</button>`: ""} ${isOwner ?`<button class="delete-btn" data-id="${postId}">🗑️</button>`: ""} ${isAdmin(currentUserEmail) && !isPinned ?`<button class="pin-btn" data-id="${postId}">📌 Pin</button>`: ""} ${isAdmin(currentUserEmail) && isPinned ?`<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>`: ""} </div> <div class="comments-section" id="comments-${postId}"></div> <div class="comment-form"> <input type="text" class="comment-input" placeholder="Write a comment..." /> <button class="comment-btn" data-id="${postId}">💬</button> </div>`;

// Like button
postEl.querySelector(”.like-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“light”);
const postRef = doc(db, “posts”, postId);

```
if (userLiked) {
  await updateDoc(postRef, { likedBy: arrayRemove(currentUserId) });
} else {
  const updates = { likedBy: arrayUnion(currentUserId) };
  if (userDisliked) updates.dislikedBy = arrayRemove(currentUserId);
  await updateDoc(postRef, updates);
  
  if (post.userId !== currentUserId) {
    await createNotification(post.userId, currentUserId, "liked your post", postId);
  }
}
```

};

// Dislike button
postEl.querySelector(”.dislike-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“light”);
const postRef = doc(db, “posts”, postId);

```
if (userDisliked) {
  await updateDoc(postRef, { dislikedBy: arrayRemove(currentUserId) });
} else {
  const updates = { dislikedBy: arrayUnion(currentUserId) };
  if (userLiked) updates.likedBy = arrayRemove(currentUserId);
  await updateDoc(postRef, updates);
}
```

};

// Share button
postEl.querySelector(”.share-btn”).onclick = (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“medium”);
navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
alert(“Post link copied!”);
};

// Gift button
const giftBtn = postEl.querySelector(”.gift-btn”);
if (giftBtn) {
giftBtn.onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“medium”);

```
  const recipientUserId = giftBtn.dataset.userid;
  const recipientDoc = await getDoc(doc(db, "users", recipientUserId));
  const recipientData = recipientDoc.data();
  
  if (!recipientData.stripeVerified || !recipientData.stripeTaxComplete) {
    alert("⚠️ This user hasn't completed their payment setup yet. Gifts can only be sent to verified creators!");
    return;
  }
  
  showGiftDialog(postId, recipientUserId, post.username);
};
```

}

// Edit button
const editBtn = postEl.querySelector(”.edit-btn”);
if (editBtn) {
editBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“light”);

```
  const postTextEl = postEl.querySelector("p");
  const currentText = post.text || "";
  
  const editForm = document.createElement("div");
  editForm.className = "edit-post-form";
  editForm.innerHTML = `
    <textarea class="edit-post-textarea">${currentText}</textarea>
    <div class="edit-post-actions">
      <button class="save-edit-btn">💾 Save</button>
      <button class="cancel-edit-btn">❌ Cancel</button>
    </div>
  `;
  
  postTextEl.replaceWith(editForm);
  const textarea = editForm.querySelector(".edit-post-textarea");
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  
  editForm.querySelector(".save-edit-btn").addEventListener("click", async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      alert("Post cannot be empty!");
      return;
    }
    
    try {
      await updateDoc(doc(db, "posts", postId), {
        text: newText,
        edited: true,
        editedAt: serverTimestamp()
      });
      
      const newPostTextEl = document.createElement("p");
      newPostTextEl.innerHTML = `${newText} <span class="edited-badge">(edited)</span>`;
      editForm.replaceWith(newPostTextEl);
      
      haptic("success");
    } catch (err) {
      alert("Error updating post: " + err.message);
    }
  });
  
  editForm.querySelector(".cancel-edit-btn").addEventListener("click", () => {
    const newPostTextEl = document.createElement("p");
    newPostTextEl.textContent = currentText;
    editForm.replaceWith(newPostTextEl);
  });
});
```

}

// Delete button
const deleteBtn = postEl.querySelector(”.delete-btn”);
if (deleteBtn) {
deleteBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“heavy”);
if (confirm(“Delete this post?”)) {
try {
await deleteDoc(doc(db, “posts”, postId));
postEl.remove();
} catch (err) {
alert(“Error deleting post: “ + err.message);
}
}
});
}

// Report button
const reportBtn = postEl.querySelector(”.report-post-btn”);
if (reportBtn) {
reportBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
showReportDialog(‘post’, postId, post.userId);
});
}

// Pin/Unpin buttons
const pinBtn = postEl.querySelector(”.pin-btn”);
if (pinBtn) {
pinBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
try {
await updateDoc(doc(db, “posts”, postId), { pinned: true });
alert(“Post pinned to top of feed!”);
} catch (err) {
alert(“Error pinning post: “ + err.message);
}
});
}

const unpinBtn = postEl.querySelector(”.unpin-btn”);
if (unpinBtn) {
unpinBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
try {
await updateDoc(doc(db, “posts”, postId), { pinned: false });
} catch (err) {
alert(“Error unpinning post: “ + err.message);
}
});
}

// Comments section
const commentsSection = postEl.querySelector(”.comments-section”);
const commentsQ = query(collection(db, “posts”, postId, “comments”), orderBy(“createdAt”, “desc”));

onSnapshot(commentsQ, (snap) => {
commentsSection.innerHTML = “”;
snap.forEach((commentDoc) => {
const comment = commentDoc.data();
const commentEl = document.createElement(“div”);
commentEl.className = “comment”;
const commentTime = comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleString() : “just now”;
commentEl.innerHTML = `<strong>${comment.username || "Anonymous"}</strong> <p>${comment.text}</p> <small>${commentTime}</small>`;

```
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
```

});

// Comment toggle
const commentToggle = postEl.querySelector(”.comment-toggle”);
commentToggle.onclick = () => {
commentsSection.style.display = commentsSection.style.display === “none” ? “block” : “none”;
};

// Add comment
postEl.querySelector(”.comment-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
const input = postEl.querySelector(”.comment-input”);
const text = input.value.trim();
if (!text) return alert(“Comment cannot be empty”);

```
const spamCheck = containsBlockedKeyword(text);
if (spamCheck.blocked) {
  alert(getBlockedMessage(spamCheck.category));
  return;
}

try {
  const userDoc = await getDoc(doc(db, "users", currentUserId));
  const userData = userDoc.data();
  const username = userData?.username || auth.currentUser.email.split("@")[0];

  await addDoc(collection(db, "posts", postId, "comments"), {
    userId: currentUserId,
    username: username,
    text,
    createdAt: serverTimestamp()
  });

  input.value = "";

  if (post.userId !== currentUserId) {
    await createNotification(post.userId, currentUserId, "commented on your post", postId);
  }
} catch (err) {
  alert("Error adding comment: " + err.message);
}
```

};

// ✅ CRITICAL FIX: Return the post element!
return postEl;
}

// ═══════════════════════════════════════════════════════════
// LOAD POSTS - FIXED TO PROPERLY AWAIT
// ═══════════════════════════════════════════════════════════
async function loadPosts() {
console.log(“📥 Loading posts…”);
const q = query(collection(db, “posts”), orderBy(“createdAt”, “desc”));

onSnapshot(q, async (snap) => {
console.log(“📊 Snapshot received:”, snap.size, “posts”);
postsContainer.innerHTML = “”;

```
if (snap.empty) {
  console.log("⚠️ No posts in database");
  postsContainer.innerHTML = "<p style='text-align: center; color: #999; padding: 2rem;'>No posts yet. Be the first to post!</p>";
  return;
}

const pinnedPosts = [];
const normalPosts = [];

snap.forEach((docSnap) => {
  const post = docSnap.data();
  if (post.pinned) {
    pinnedPosts.push({ post, id: docSnap.id });
  } else {
    normalPosts.push({ post, id: docSnap.id });
  }
});

console.log("📌 Pinned:", pinnedPosts.length, "Normal:", normalPosts.length);

// Render pinned posts first
for (const { post, id } of pinnedPosts) {
  try {
    const postEl = await renderPost(post, id);
    if (postEl) {
      postsContainer.appendChild(postEl);
      console.log("✅ Rendered pinned post:", id);
    }
  } catch (err) {
    console.error("❌ Error rendering pinned post:", err);
  }
}

// Render normal posts
for (const { post, id } of normalPosts) {
  try {
    const postEl = await renderPost(post, id);
    if (postEl) {
      postsContainer.appendChild(postEl);
      console.log("✅ Rendered post:", id);
    }
  } catch (err) {
    console.error("❌ Error rendering post:", err);
  }
}

console.log("✅ Feed loaded successfully with", snap.size, "posts");
```

});
}

// ═══════════════════════════════════════════════════════════
// GIFT SYSTEM
// ═══════════════════════════════════════════════════════════

const GIFT_TYPES = {
rose: { name: “Rose”, icon: “🌹”, price: 1.99 },
coffee: { name: “Coffee”, icon: “☕”, price: 4.99 },
bear: { name: “Teddy Bear”, icon: “🧸”, price: 9.99 },
cake: { name: “Cake”, icon: “🍰”, price: 14.99 },
diamond: { name: “Diamond”, icon: “💎”, price: 49.99 },
yacht: { name: “Yacht”, icon: “🛥️”, price: 99.99 }
};

function showGiftDialog(postId, recipientUserId, recipientUsername) {
const dialog = document.createElement(‘div’);
dialog.className = ‘gift-dialog-overlay’;
dialog.innerHTML = `<div class="gift-dialog"> <h3>🎁 Send a Gift to ${recipientUsername}</h3> <p class="gift-subtitle">Show appreciation! 100% goes to the creator after fees.</p> <div class="gift-options"></div> <button class="gift-cancel-btn">Cancel</button> </div>`;

const optionsContainer = dialog.querySelector(’.gift-options’);

Object.entries(GIFT_TYPES).forEach(([type, { name, icon, price }]) => {
const option = document.createElement(‘div’);
option.className = ‘gift-option’;
option.innerHTML = `<div class="gift-icon">${icon}</div> <span class="gift-name">${name}</span> <span class="gift-price">$${price.toFixed(2)}</span>`;
option.onclick = () => sendGift(postId, recipientUserId, type, price);
optionsContainer.appendChild(option);
});

dialog.querySelector(’.gift-cancel-btn’).onclick = () => dialog.remove();

dialog.addEventListener(‘click’, (e) => {
if (e.target === dialog) dialog.remove();
});

document.body.appendChild(dialog);
}

async function sendGift(postId, recipientUserId, giftType, price) {
try {
const paymentSuccess = true;

```
if (!paymentSuccess) {
  alert("Payment failed. Please try again.");
  return;
}

await addDoc(collection(db, "gifts"), {
  fromUserId: auth.currentUser.uid,
  toUserId: recipientUserId,
  postId: postId,
  giftType: giftType,
  amount: price,
  createdAt: serverTimestamp()
});

const recipientRef = doc(db, "users", recipientUserId);
const recipientDoc = await getDoc(recipientRef);
const currentEarnings = recipientDoc.data().totalEarnings || 0;
await updateDoc(recipientRef, {
  totalEarnings: currentEarnings + price
});

alert(`🎁 Gift sent! ${GIFT_TYPES[giftType].icon} ${GIFT_TYPES[giftType].name}`);
haptic("success");

document.querySelector('.gift-dialog-overlay')?.remove();
```

} catch (err) {
console.error(“Error sending gift:”, err);
alert(“Error sending gift. Please try again.”);
}
}

// ═══════════════════════════════════════════════════════════
// CREATE POST
// ═══════════════════════════════════════════════════════════
postBtn.addEventListener(“click”, async () => {
const text = postText.value.trim();
const file = postFileInput.files[0];

if (!text && !file) return alert(“Post cannot be empty”);

const spamCheck = containsBlockedKeyword(text);
if (spamCheck.blocked) {
alert(getBlockedMessage(spamCheck.category));
return;
}

if (!checkRateLimit()) return;

let mediaURL = “”;
let mediaType = “”;

if (file) {
mediaType = file.type.startsWith(“video”) ? “video” : “image”;
const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
await uploadBytes(storageRef, file);
mediaURL = await getDownloadURL(storageRef);
}

const userDoc = await getDoc(doc(db, “users”, auth.currentUser.uid));
const userData = userDoc.data();
const username = userData?.username || auth.currentUser.email.split(”@”)[0];

try {
await addDoc(collection(db, “posts”), {
userId: auth.currentUser.uid,
username: username,
text,
mediaURL,
mediaType,
likedBy: [],
dislikedBy: [],
pinned: false,
createdAt: serverTimestamp()
});

```
haptic("medium");
postText.value = "";
postFileInput.value = "";
```

} catch (err) {
alert(“Error creating post: “ + err.message);
}
});

// ═══════════════════════════════════════════════════════════
// LOGIN STREAK
// ═══════════════════════════════════════════════════════════
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
    setTimeout(() => {
      alert(`🔥 ${newStreak} DAY STREAK! You're on fire! 🎉`);
    }, 1000);
  } else if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
    setTimeout(() => {
      alert(`✨ ${newStreak} day streak! Keep logging in daily! 🌟`);
    }, 1000);
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

// ═══════════════════════════════════════════════════════════
// AUTH & INIT
// ═══════════════════════════════════════════════════════════
auth.onAuthStateChanged(async (user) => {
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
loadPosts();
```

}
});

// ═══════════════════════════════════════════════════════════
// HAMBURGER MENU
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// USER SEARCH
// ═══════════════════════════════════════════════════════════
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
        username: username,
        photoURL: userData.photoURL || "https://via.placeholder.com/50"
      });
    }
  });
  
  if (matchedUsers.length > 0) {
    searchResults.style.display = "block";
    searchResults.innerHTML = matchedUsers.map(user => `
      <div class="search-result-item" data-user-id="${user.id}">
        <img src="${user.photoURL}" alt="${user.username}" class="search-result-avatar" onerror="this.src='https://via.placeholder.com/50'">
        <strong class="search-result-username">${user.username}</strong>
      </div>
    `).join("");
    
    searchResults.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        const userId = item.getAttribute("data-user-id");
        window.location.href = `profile.html?userId=${userId}`;
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

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS (Helper function)
// ═══════════════════════════════════════════════════════════
async function createNotification(toUserId, fromUserId, message, postId = null) {
if (toUserId === fromUserId) return;

try {
const fromUserDoc = await getDoc(doc(db, “users”, fromUserId));
const fromUserData = fromUserDoc.data();

```
await addDoc(collection(db, "users", toUserId, "notifications"), {
  fromUserId: fromUserId,
  fromUsername: fromUserData?.username || "Someone",
  fromUserAvatar: fromUserData?.photoURL || "https://via.placeholder.com/40",
  message: message,
  postId: postId,
  read: false,
  createdAt: serverTimestamp()
});
```

} catch (err) {
console.error(“Error creating notification:”, err);
}
}

// ═══════════════════════════════════════════════════════════
// REPORT SYSTEM
// ═══════════════════════════════════════════════════════════
async function reportContent(contentType, contentId, reportedUserId, reason) {
try {
await addDoc(collection(db, “reports”), {
contentType: contentType,
contentId: contentId,
reportedUserId: reportedUserId,
reporterId: auth.currentUser.uid,
reporterEmail: auth.currentUser.email,
reason: reason,
status: “pending”,
createdAt: serverTimestamp()
});

```
alert("✅ Report submitted successfully.");
```

} catch (err) {
console.error(“Error submitting report:”, err);
alert(“❌ Error submitting report.”);
}
}

function showReportDialog(contentType, contentId, reportedUserId) {
const reasons = [
“Hate speech or discrimination”,
“Threats or violence”,
“Harassment or bullying”,
“Spam or scam”,
“Inappropriate content”,
“Impersonation”,
“Other”
];

let reasonsHtml = reasons.map((r) => `<option value="${r}">${r}</option>`).join(’’);

const dialog = document.createElement(‘div’);
dialog.className = ‘report-dialog-overlay’;
dialog.innerHTML = `<div class="report-dialog"> <h3>🚨 Report ${contentType}</h3> <p>Help us keep YourSpace safe.</p> <select id="reportReason" class="report-reason-select"> <option value="">Select a reason...</option> ${reasonsHtml} </select> <div class="report-dialog-buttons"> <button class="report-submit-btn" id="submitReport">Submit</button> <button class="report-cancel-btn" id="cancelReport">Cancel</button> </div> </div>`;

document.body.appendChild(dialog);

document.getElementById(‘submitReport’).addEventListener(‘click’, async () => {
const reason = document.getElementById(‘reportReason’).value;
if (!reason) {
alert(“Please select a reason.”);
return;
}

```
await reportContent(contentType, contentId, reportedUserId, reason);
dialog.remove();
```

});

document.getElementById(‘cancelReport’).addEventListener(‘click’, () => {
dialog.remove();
});

dialog.addEventListener(‘click’, (e) => {
if (e.target === dialog) dialog.remove();
});
}
