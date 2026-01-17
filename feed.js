import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, orderBy, increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase Config
// ---------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ---------------------
// DOM Elements
// ---------------------
const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function getUsername(uid) {
  try {
    const snap = await getDocs(query(collection(db, "users")));
    const userSnap = await getDoc(doc(db, "users", uid));
    return userSnap.exists() ? userSnap.data().username : "Anonymous";
  } catch { return "Anonymous"; }
}

async function renderComments(postId, commentsContainer) {
  commentsContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc")));
  snap.forEach(async cSnap => {
    const data = cSnap.data();
    const username = await getUsername(data.userId);
    const p = document.createElement("p");
    p.innerHTML = `<span class="comment-user" data-uid="${data.userId}">${username}</span>: ${data.text}`;
    p.querySelector(".comment-user").addEventListener("click", e => {
      window.location.href = `profile.html?uid=${e.target.dataset.uid}`;
    });
    commentsContainer.appendChild(p);
  });
}

async function renderPost(postData, postId) {
  const postEl = document.createElement("div");
  postEl.className = "post-container";

  const username = await getUsername(postData.userId);

  let mediaHTML = "";
  if (postData.mediaType === "image") mediaHTML = `<img src="${postData.mediaURL}" class="post-media">`;
  else if (postData.mediaType === "video") mediaHTML = `<video controls class="post-media"><source src="${postData.mediaURL}"></video>`;

  postEl.innerHTML = `
    <div class="post-header">
      <span class="post-username" data-uid="${postData.userId}">${username}</span>
      ${postData.userId === auth.currentUser.uid ? `<button class="delete-post">Delete</button>` : ""}
    </div>
    <div class="post-body">
      <p>${postData.text || ""}</p>
      ${mediaHTML}
    </div>
    <div class="post-footer">
      <button class="like-btn">👍 ${postData.likes || 0}</button>
      <button class="dislike-btn">🖕 ${postData.dislikes || 0}</button>
      <button class="share-btn">Share</button>
    </div>
    <div class="comment-section">
      <div class="comments-container"></div>
      <input type="text" placeholder="Add a comment" class="comment-input">
      <button class="comment-btn">Post</button>
    </div>
  `;

  postEl.querySelector(".post-username").addEventListener("click", e => {
    window.location.href = `profile.html?uid=${e.target.dataset.uid}`;
  });

  const commentsContainer = postEl.querySelector(".comments-container");
  const commentInput = postEl.querySelector(".comment-input");
  const commentBtn = postEl.querySelector(".comment-btn");

  // Load comments
  renderComments(postId, commentsContainer);

  // Add comment
  commentBtn.addEventListener("click", async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: auth.currentUser.uid,
      text,
      createdAt: new Date()
    });
    commentInput.value = "";
    renderComments(postId, commentsContainer);
  });

  // Delete post
  postEl.querySelector(".delete-post")?.addEventListener("click", async () => {
    await deleteDoc(doc(db, "posts", postId));
    postEl.remove();
  });

  // Like / Dislike
  postEl.querySelector(".like-btn").addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postId), { likes: increment(1) });
    postData.likes = (postData.likes || 0) + 1;
    postEl.querySelector(".like-btn").textContent = `👍 ${postData.likes}`;
  });
  postEl.querySelector(".dislike-btn").addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postId), { dislikes: increment(1) });
    postData.dislikes = (postData.dislikes || 0) + 1;
    postEl.querySelector(".dislike-btn").textContent = `🖕 ${postData.dislikes}`;
  });

  // Share
  postEl.querySelector(".share-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied!");
  });

  postsContainer.appendChild(postEl);
}

// ---------------------
// Load Posts
// ---------------------
async function loadPosts() {
  postsContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  snap.forEach(docSnap => renderPost(docSnap.data(), docSnap.id));
}

// ---------------------
// Create Post
// ---------------------
postBtn?.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  let mediaURL = "";
  let mediaType = "";
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "posts"), {
    userId: auth.currentUser.uid,
    text,
    mediaURL,
    mediaType,
    likes: 0,
    dislikes: 0,
    createdAt: new Date()
  });

  postText.value = "";
  postFileInput.value = "";
  await loadPosts();
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) return window.location.href = "login.html";
  loadPosts();
});
