// feed.js — FINAL polished version (YourSpace 2026)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// ───────────────── Firebase ─────────────────

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

// ───────────────── HAPTICS ─────────────────

function haptic(type = "light") {
  if (!navigator.vibrate) return;
  if (type === "light") navigator.vibrate(10);
  if (type === "medium") navigator.vibrate(20);
  if (type === "heavy") navigator.vibrate([30, 20, 30]);
}

// ───────────────── DOM ─────────────────

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// ───────────────── NAV ─────────────────

document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ───────────────── RENDER POST ─────────────────

async function renderPost(post, postId) {
  const isOwner = post.userId === auth.currentUser.uid;

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
      <button class="like-btn">👍 ${post.likes || 0}</button>
      <button class="dislike-btn">🖕 ${post.dislikes || 0}</button>
      <button class="comment-toggle">💬</button>
      <button class="share-btn">🔗</button>
      ${isOwner ? `<button class="delete-btn">🗑️</button>` : ""}
    </div>
    <div class="comments-section">
      <div class="comments-container"></div>

      <div class="comment-form">
        <input type="text" class="comment-input" placeholder="Write a comment..." />
        <button class="comment-btn">💬</button>
      </div>
    </div>
  `;

  // LIKE
  postEl.querySelector(".like-btn").onclick = async () => {
    haptic("light");
    await updateDoc(doc(db, "posts", postId), {
      likes: (post.likes || 0) + 1
    });
  };

  // DISLIKE
  postEl.querySelector(".dislike-btn").onclick = async () => {
    haptic("light");
    await updateDoc(doc(db, "posts", postId), {
      dislikes: (post.dislikes || 0) + 1
    });
  };

  // SHARE
  postEl.querySelector(".share-btn").onclick = () => {
    haptic("medium");
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied!");
  };

  // DELETE POST
  postEl.querySelector(".delete-btn")?.addEventListener("click", async () => {
    haptic("heavy");
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", postId));
    }
  });

  // COMMENTS REALTIME
  const commentsContainer = postEl.querySelector(".comments-container");
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));

  onSnapshot(commentsQ, (snap) => {
    commentsContainer.innerHTML = "";

    snap.forEach((cDoc) => {
      const c = cDoc.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";

      const isCommentOwner = c.userId === auth.currentUser.uid;

      cEl.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        ${isCommentOwner ? `<button class="delete-comment" data-id="${cDoc.id}">🗑️</button>` : ""}
      `;

      // DELETE COMMENT
      cEl.querySelector(".delete-comment")?.addEventListener("click", async () => {
        haptic("heavy");
        if (confirm("Delete this comment?")) {
          await deleteDoc(doc(db, "posts", postId, "comments", cDoc.id));
        }
      });

      commentsContainer.appendChild(cEl);
    });
  });

  // ADD COMMENT
  postEl.querySelector(".comment-btn").onclick = async () => {
    const input = postEl.querySelector(".comment-input");
    const text = input.value.trim();
    if (!text) return;

    haptic("medium");

    await addDoc(collection(db, "posts", postId, "comments"), {
      text,
      userId: auth.currentUser.uid,
      username: auth.currentUser.email.split("@")[0],
      createdAt: serverTimestamp()
    });

    input.value = "";
  };

  postsContainer.appendChild(postEl);
}

/* ───────────────── LOAD POSTS ───────────────── */

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    postsContainer.innerHTML = "";
    snap.forEach((docSnap) => renderPost(docSnap.data(), docSnap.id));
  });
}

/* ───────────────── CREATE POST ───────────────── */

postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  let mediaURL = "";
  let mediaType = "";

  if (file) {
    mediaType = file.type.startsWith("video") ? "video" : "image";
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "posts"), {
    userId: auth.currentUser.uid,
    username: auth.currentUser.email.split("@")[0],
    text,
    mediaURL,
    mediaType,
    likes: 0,
    dislikes: 0,
    createdAt: serverTimestamp()
  });

  haptic("medium");

  postText.value = "";
  postFileInput.value = "";
});

// AUTH CHECK
auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "login.html";
  else loadPosts();
});
