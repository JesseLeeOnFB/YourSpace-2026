// feed.js — FIXED VERSION (YourSpace 2026)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, getDoc
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
  const currentUserId = auth.currentUser.uid;

  // Check if user has liked/disliked
  const likedBy = post.likedBy || [];
  const dislikedBy = post.dislikedBy || [];
  const userLiked = likedBy.includes(currentUserId);
  const userDisliked = dislikedBy.includes(currentUserId);

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
      <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">👎 ${dislikedBy.length}</button>
      <button class="comment-toggle" data-id="${postId}">💬</button>
      <button class="share-btn" data-id="${postId}">🔗</button>
      ${isOwner ? `<button class="delete-btn" data-id="${postId}">🗑️</button>` : ""}
    </div>
    <div class="comments-section" id="comments-${postId}"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="Write a comment..." />
      <button class="comment-btn" data-id="${postId}">💬</button>
    </div>
  `;

  // LIKE (FIXED – prevents multiple likes)
  postEl.querySelector(".like-btn").onclick = async () => {
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userLiked) {
      // Remove like
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUserId)
      });
    } else {
      // Add like and remove dislike if exists
      const updates = {
        likedBy: arrayUnion(currentUserId)
      };
      if (userDisliked) {
        updates.dislikedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
  };

  // DISLIKE (FIXED – prevents multiple dislikes)
  postEl.querySelector(".dislike-btn").onclick = async () => {
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userDisliked) {
      // Remove dislike
      await updateDoc(postRef, {
        dislikedBy: arrayRemove(currentUserId)
      });
    } else {
      // Add dislike and remove like if exists
      const updates = {
        dislikedBy: arrayUnion(currentUserId)
      };
      if (userLiked) {
        updates.likedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
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

  // COMMENTS REALTIME (FIXED – delete button now works)
  const commentsSection = postEl.querySelector(".comments-section");
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));

  onSnapshot(commentsQ, (snap) => {
    commentsSection.innerHTML = "";

    snap.forEach((cDoc) => {
      const c = cDoc.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";

      const isCommentOwner = c.userId === auth.currentUser.uid;

      cEl.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️</button>` : ""}
      `;

      // DELETE COMMENT (FIXED – properly deletes from Firestore)
      const deleteBtn = cEl.querySelector(".delete-comment");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          haptic("heavy");
          if (confirm("Delete this comment?")) {
            const commentId = e.target.getAttribute("data-comment-id");
            const postIdForComment = e.target.getAttribute("data-post-id");
            await deleteDoc(doc(db, "posts", postIdForComment, "comments", commentId));
          }
        });
      }

      commentsSection.appendChild(cEl);
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
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  });

  haptic("medium");

  postText.value = "";
  postFileInput.value = "";
  loadPosts();
});

// AUTH CHECK
auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "login.html";
  else loadPosts();
});
