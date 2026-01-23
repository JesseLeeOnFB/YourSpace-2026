// feed.js — FULL FINAL WORKING VERSION (YourSpace)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs,
  updateDoc, query, orderBy, where, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

/* ───────────────── FIREBASE INIT ───────────────── */

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
const storage = getStorage(app);

/* ───────────────── GLOBALS ───────────────── */

const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

/* ───────────────── HELPERS ───────────────── */

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

function haptic(ms = 15) {
  navigator.vibrate?.(ms);
}

/* ───────────────── RATE LIMIT ───────────────── */

const postTimestamps = [];
function checkRateLimit() {
  const now = Date.now();
  while (postTimestamps.length && now - postTimestamps[0] > 120000) {
    postTimestamps.shift();
  }
  if (postTimestamps.length >= 5) {
    alert("⏱️ Slow down — 5 posts per 2 minutes.");
    return false;
  }
  postTimestamps.push(now);
  return true;
}

/* ───────────────── CONTENT FILTER ───────────────── */

const BLOCKED = [
  "nigger","nigga","faggot","retard","kys","kill myself","suicide",
  "kill you","bomb","rape","shoot you"
];

function blocked(text) {
  if (!text) return false;
  return BLOCKED.some(w => text.toLowerCase().includes(w));
}

/* ───────────────── CREATE POST ───────────────── */

postBtn?.addEventListener("click", async () => {
  if (!checkRateLimit()) return;

  const text = postText.value.trim();
  const file = postFileInput.files[0];
  if (!text && !file) return alert("Post cannot be empty");
  if (blocked(text)) return alert("Blocked content detected");

  const user = auth.currentUser;
  if (!user) return;

  let mediaURL = "";
  let mediaType = "";

  if (file) {
    mediaType = file.type.startsWith("video") ? "video" : "image";
    const r = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(r, file);
    mediaURL = await getDownloadURL(r);
  }

  const uDoc = await getDoc(doc(db, "users", user.uid));
  const username = uDoc.data()?.username || user.email.split("@")[0];

  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username,
    text,
    mediaURL,
    mediaType,
    likedBy: [],
    dislikedBy: [],
    pinned: false,
    trending: false,
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postFileInput.value = "";
  haptic();
});

/* ───────────────── RENDER POST ───────────────── */

async function renderPost(post, postId) {
  const user = auth.currentUser;
  const isOwner = post.userId === user.uid;

  const el = document.createElement("div");
  el.className = "post-card";
  el.id = `post-${postId}`;

  el.innerHTML = `
    ${post.pinned ? `<div class="pin-badge">📌 Pinned</div>` : ""}
    ${post.trending ? `<div class="trend-badge">🔥 Trending</div>` : ""}
    <strong>${post.username}</strong>
    <small>${post.createdAt?.toDate?.().toLocaleString() || "now"}</small>
    <p>${post.text || ""}</p>
    ${post.mediaURL ? (
      post.mediaType === "video"
        ? `<video controls src="${post.mediaURL}" class="post-media"></video>`
        : `<img src="${post.mediaURL}" class="post-media" />`
    ) : ""}
    <div class="actions">
      <button class="like">👍 ${post.likedBy?.length || 0}</button>
      <button class="dislike">🖕 ${post.dislikedBy?.length || 0}</button>
      <button class="comment-toggle">💬</button>
      <button class="share">🔗</button>
      ${!isOwner ? `<button class="gift">🎁</button>` : ""}
      ${isOwner ? `<button class="delete">🗑️</button>` : ""}
      ${isAdmin(user.email) && !post.pinned ? `<button class="pin">📌</button>` : ""}
    </div>
    <div class="comments"></div>
    <div class="comment-form">
      <input placeholder="Write a comment…" />
      <button>Send</button>
    </div>
  `;

  /* ─── ACTIONS ─── */

  el.querySelector(".like").onclick = async () => {
    const r = doc(db, "posts", postId);
    if (post.likedBy.includes(user.uid)) {
      await updateDoc(r, { likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(r, {
        likedBy: arrayUnion(user.uid),
        dislikedBy: arrayRemove(user.uid)
      });
    }
  };

  el.querySelector(".dislike").onclick = async () => {
    const r = doc(db, "posts", postId);
    if (post.dislikedBy.includes(user.uid)) {
      await updateDoc(r, { dislikedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(r, {
        dislikedBy: arrayUnion(user.uid),
        likedBy: arrayRemove(user.uid)
      });
    }
  };

  el.querySelector(".share").onclick = () => {
    navigator.clipboard.writeText(`${location.origin}/feed.html#post-${postId}`);
    alert("Link copied");
  };

  el.querySelector(".delete")?.addEventListener("click", async () => {
    if (confirm("Delete post?")) {
      await deleteDoc(doc(db, "posts", postId));
    }
  });

  el.querySelector(".pin")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postId), { pinned: true });
  });

  /* ─── COMMENTS ─── */

  const commentsBox = el.querySelector(".comments");
  const cQuery = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(cQuery, snap => {
    commentsBox.innerHTML = "";
    snap.forEach(c => {
      const d = c.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";
      cEl.innerHTML = `<strong>${d.username}</strong><p>${d.text}</p>`;
      commentsBox.appendChild(cEl);
    });
  });

  el.querySelector(".comment-form button").onclick = async () => {
    const input = el.querySelector(".comment-form input");
    if (!input.value) return;
    const uDoc = await getDoc(doc(db, "users", user.uid));
    await addDoc(collection(db, "posts", postId, "comments"), {
      text: input.value,
      username: uDoc.data()?.username || user.email.split("@")[0],
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    input.value = "";
  };

  postsContainer.appendChild(el);
}

/* ───────────────── LOAD FEED ───────────────── */

function loadPosts() {
  const q = query(
    collection(db, "posts"),
    where("createdAt", "!=", null),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {
    postsContainer.innerHTML = "";
    snap.forEach(d => renderPost(d.data(), d.id));
  });
}

/* ───────────────── AUTH ───────────────── */

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
  } else {
    loadPosts();
  }
});

/* ───────────────── NAV / LOGOUT ───────────────── */

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "login.html";
});
