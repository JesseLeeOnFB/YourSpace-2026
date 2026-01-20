// feed.js - Complete with spam protection integrated

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import {
getFirestore, collection, addDoc, doc, deleteDoc, getDoc, updateDoc,
query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment
} from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;
import { getAuth, signOut, onAuthStateChanged } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;
import { getStorage, ref, uploadBytes, getDownloadURL } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js”;

// SPAM PROTECTION IMPORT
import { checkRateLimit, checkBanStatus, reportContent } from “./spam-protection.js”;

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

// BLOCKED KEYWORDS - Real words (not censored)
const BLOCKED_KEYWORDS = [
“nigger”, “nigga”, “faggot”, “chink”, “spic”, “kike”, “retard”,
“kill yourself”, “kys”, “bomb threat”, “mass shooting”, “school shooter”,
“suicide”, “kill myself”, “hang myself”, “cut myself”, “slit my wrists”,
“rape you”, “sexual assault”, “molest”, “gas the”, “lynch”, “exterminate”
];

let currentUser = null;
let currentReportData = null;

function containsBlockedKeyword(text) {
if (!text) return false;
const lowerText = text.toLowerCase();
return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// AUTH STATE CHECK WITH BAN STATUS
onAuthStateChanged(auth, async (user) => {
if (!user) {
window.location.href = “login.html”;
return;
}

currentUser = user;

// CHECK BAN STATUS
try {
const banStatus = await checkBanStatus(user.uid);
if (banStatus.isBanned) {
const message = banStatus.expiresAt
? `You are banned until ${banStatus.expiresAt.toLocaleString()}.\n\nReason: ${banStatus.reason}`
: `You are permanently banned.\n\nReason: ${banStatus.reason}`;

```
  alert(message);
  await signOut(auth);
  window.location.href = "login.html";
  return;
}
```

} catch (error) {
console.error(“Ban check error:”, error);
}

loadFeed();
setupPostButton();
setupReportModal();
setupRewardModal();
});

// LOGOUT
document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

// POST BUTTON WITH RATE LIMITING
function setupPostButton() {
document.getElementById(“postBtn”).onclick = async () => {
const text = document.getElementById(“postText”).value.trim();
const file = document.getElementById(“postFileInput”).files[0];

```
if (!text && !file) {
  alert("Please enter some text or select a file");
  return;
}

// KEYWORD FILTER
if (containsBlockedKeyword(text)) {
  alert("Your post contains blocked content and cannot be posted.");
  return;
}

// RATE LIMIT CHECK
try {
  const rateCheck = await checkRateLimit(currentUser.uid, 'post');
  if (!rateCheck.allowed) {
    alert(rateCheck.reason);
    return;
  }
} catch (error) {
  console.error("Rate limit check error:", error);
}

// Create post
try {
  const postData = {
    text,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    timestamp: serverTimestamp(),
    likedBy: [],
    dislikedBy: [],
    commentCount: 0
  };
  
  // Get username
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  postData.username = userDoc.exists() ? userDoc.data().username : currentUser.email.split('@')[0];
  
  if (file) {
    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    postData.mediaURL = await getDownloadURL(storageRef);
    postData.mediaType = file.type.startsWith('video') ? 'video' : 'image';
  }
  
  await addDoc(collection(db, "posts"), postData);
  
  document.getElementById("postText").value = "";
  document.getElementById("postFileInput").value = "";
  document.getElementById("filePreview").innerHTML = "";
  
  alert("Post created successfully!");
} catch (error) {
  console.error("Post error:", error);
  alert("Error creating post: " + error.message);
}
```

};
}

// LOAD FEED
function loadFeed() {
const postsQuery = query(collection(db, “posts”), orderBy(“timestamp”, “desc”));

onSnapshot(postsQuery, (snapshot) => {
const container = document.getElementById(“postsContainer”);
container.innerHTML = “”;

```
if (snapshot.empty) {
  container.innerHTML = '<p class="loading">No posts yet. Be the first to post!</p>';
  return;
}

snapshot.forEach((docSnap) => {
  const post = docSnap.data();
  const postId = docSnap.id;
  container.appendChild(renderPost(post, postId));
});
```

});
}

// RENDER POST WITH REPORT BUTTON
function renderPost(post, postId) {
const isOwner = post.userId === currentUser.uid;
const likedBy = post.likedBy || [];
const dislikedBy = post.dislikedBy || [];
const userLiked = likedBy.includes(currentUser.uid);
const userDisliked = dislikedBy.includes(currentUser.uid);

const postEl = document.createElement(“div”);
postEl.className = “post-card card”;

// Post header
const header = document.createElement(“div”);
header.className = “post-header”;
header.innerHTML = `<div class="post-author"> <strong><a href="profile.html?userId=${post.userId}" class="username-link">${post.username || 'Anonymous'}</a></strong> <span class="post-time">${post.timestamp?.toDate().toLocaleString() || 'Just now'}</span> </div>`;
postEl.appendChild(header);

// Post content
if (post.text) {
const textEl = document.createElement(“p”);
textEl.className = “post-text”;
textEl.textContent = post.text;
postEl.appendChild(textEl);
}

// Media
if (post.mediaURL) {
const mediaEl = post.mediaType === ‘video’
? document.createElement(“video”)
: document.createElement(“img”);
mediaEl.src = post.mediaURL;
mediaEl.className = “post-media”;
if (post.mediaType === ‘video’) mediaEl.controls = true;
postEl.appendChild(mediaEl);
}

// Actions
const actions = document.createElement(“div”);
actions.className = “post-actions”;

const likeBtn = document.createElement(“button”);
likeBtn.innerHTML = `👍 ${likedBy.length}`;
likeBtn.className = userLiked ? “liked” : “”;
likeBtn.onclick = () => toggleLike(postId);

const dislikeBtn = document.createElement(“button”);
dislikeBtn.innerHTML = `👎 ${dislikedBy.length}`;
dislikeBtn.className = userDisliked ? “disliked” : “”;
dislikeBtn.onclick = () => toggleDislike(postId);

const commentBtn = document.createElement(“button”);
commentBtn.innerHTML = `💬 ${post.commentCount || 0}`;
commentBtn.onclick = () => window.location.href = `post.html?id=${postId}`;

const rewardBtn = document.createElement(“button”);
rewardBtn.innerHTML = “💎 Reward”;
rewardBtn.onclick = () => openRewardModal(post.userId, postId);

// REPORT BUTTON
const reportBtn = document.createElement(“button”);
reportBtn.innerHTML = “🚨 Report”;
reportBtn.className = “report-btn”;
reportBtn.onclick = () => openReportModal(‘post’, postId, post.userId);

actions.appendChild(likeBtn);
actions.appendChild(dislikeBtn);
actions.appendChild(commentBtn);
actions.appendChild(rewardBtn);
if (!isOwner) actions.appendChild(reportBtn);

if (isOwner || isAdmin(currentUser.email)) {
const deleteBtn = document.createElement(“button”);
deleteBtn.innerHTML = “🗑️ Delete”;
deleteBtn.className = “delete-btn”;
deleteBtn.onclick = () => deletePost(postId);
actions.appendChild(deleteBtn);
}

postEl.appendChild(actions);
return postEl;
}

async function toggleLike(postId) {
const postRef = doc(db, “posts”, postId);
const postDoc = await getDoc(postRef);
const likedBy = postDoc.data().likedBy || [];

if (likedBy.includes(currentUser.uid)) {
await updateDoc(postRef, { likedBy: arrayRemove(currentUser.uid) });
} else {
await updateDoc(postRef, {
likedBy: arrayUnion(currentUser.uid),
dislikedBy: arrayRemove(currentUser.uid)
});
}
}

async function toggleDislike(postId) {
const postRef = doc(db, “posts”, postId);
const postDoc = await getDoc(postRef);
const dislikedBy = postDoc.data().dislikedBy || [];

if (dislikedBy.includes(currentUser.uid)) {
await updateDoc(postRef, { dislikedBy: arrayRemove(currentUser.uid) });
} else {
await updateDoc(postRef, {
dislikedBy: arrayUnion(currentUser.uid),
likedBy: arrayRemove(currentUser.uid)
});
}
}

async function deletePost(postId) {
if (!confirm(“Delete this post?”)) return;

try {
await deleteDoc(doc(db, “posts”, postId));
alert(“Post deleted”);
} catch (error) {
alert(“Error deleting post”);
}
}

// REPORT MODAL SETUP
function setupReportModal() {
const modal = document.getElementById(‘reportModal’);
const closeBtn = document.getElementById(‘closeReportModal’);
const submitBtn = document.getElementById(‘submitReportBtn’);
const cancelBtn = document.getElementById(‘cancelReportBtn’);

closeBtn.onclick = () => modal.style.display = ‘none’;
cancelBtn.onclick = () => modal.style.display = ‘none’;

modal.onclick = (e) => {
if (e.target === modal) modal.style.display = ‘none’;
};

submitBtn.onclick = async () => {
const reason = document.getElementById(‘reportReason’).value;
const description = document.getElementById(‘reportDescription’).value;

```
if (!reason) {
  alert('Please select a reason for reporting');
  return;
}

if (!currentReportData) return;

try {
  const result = await reportContent({
    reporterId: currentUser.uid,
    reportedUserId: currentReportData.userId,
    contentType: currentReportData.type,
    contentId: currentReportData.id,
    reason,
    description
  });
  
  if (result.success) {
    alert(result.message);
    modal.style.display = 'none';
    document.getElementById('reportReason').value = '';
    document.getElementById('reportDescription').value = '';
    currentReportData = null;
  } else {
    alert('Error: ' + result.message);
  }
} catch (error) {
  console.error("Report error:", error);
  alert('Error submitting report: ' + error.message);
}
```

};
}

function openReportModal(type, id, userId) {
currentReportData = { type, id, userId };
document.getElementById(‘reportModal’).style.display = ‘block’;
}

// REWARD MODAL
let selectedReward = null;
let rewardRecipient = null;

function setupRewardModal() {
const modal = document.getElementById(‘rewardModal’);
const closeBtn = document.getElementById(‘closeRewardModal’);
const sendBtn = document.getElementById(‘sendRewardBtn’);

closeBtn.onclick = () => modal.style.display = ‘none’;

modal.onclick = (e) => {
if (e.target === modal) modal.style.display = ‘none’;
};

document.querySelectorAll(’.reward-package’).forEach(pkg => {
pkg.onclick = () => {
document.querySelectorAll(’.reward-package’).forEach(p => p.classList.remove(‘selected’));
pkg.classList.add(‘selected’);
selectedReward = parseInt(pkg.dataset.amount);
sendBtn.disabled = false;
sendBtn.textContent = `Send $${selectedReward} Reward`;
};
});

sendBtn.onclick = async () => {
if (!selectedReward || !rewardRecipient) return;

```
alert('Redirecting to Stripe checkout...');
// Stripe integration would go here
modal.style.display = 'none';
```

};
}

function openRewardModal(userId, postId) {
rewardRecipient = { userId, postId };
selectedReward = null;
document.querySelectorAll(’.reward-package’).forEach(p => p.classList.remove(‘selected’));
document.getElementById(‘sendRewardBtn’).disabled = true;
document.getElementById(‘sendRewardBtn’).textContent = ‘Select a reward package’;
document.getElementById(‘rewardModal’).style.display = ‘block’;
}
