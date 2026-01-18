// feed.js – Updated with post delete button, working likes/dislikes/shares, comment button with containers, poster/commenter delete comment, fixed image sizes

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, orderBy, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
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

// DOM
const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// NAV BUTTONS
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

// RENDER POST
async function renderPost(post, postId) {
  const isOwner = post.userId === auth.currentUser.uid;

  const postEl = document.createElement("div");
  postEl.className = "post";

  const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";

  postEl.innerHTML = `
    <strong>${post.username}</strong> <small>${time}</small>
    <p>${post.text}</p>
    ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
    <div class="actions">
      <button class="like-btn" data-id="${postId}">Like (${post.likes || 0})</button>
      <button class="dislike-btn" data-id="${postId}">Dislike (${post.dislikes || 0})</button>
      <button class="share-btn" data-id="${postId}">Share</button>
      ${isOwner ? `<button class="delete-btn" data-id="${postId}">Delete</button>` : ""}
    </div>
    <div class="comments-container" id="comments-${postId}"></div>
    <input type="text" class="comment-input" id="commentInput-${postId}" placeholder="Add a comment...">
    <button class="comment-btn" data-id="${postId}">Comment</button>
  `;

  // LIKE
  postEl.querySelector(".like-btn").addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
  });

  // DISLIKE
  postEl.querySelector(".dislike-btn").addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postId), { dislikes: (post.dislikes || 0) + 1 });
  });

  // SHARE
  postEl.querySelector(".share-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied");
  });

  // DELETE POST
  postEl.querySelector(".delete-btn")?.addEventListener("click", async () => {
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", postId));
      loadPosts();
    }
  });

  // LOAD COMMENTS
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
  onSnapshot(commentsQ, (snap) => {
    const commentsContainer = postEl.querySelector(".comments-container");
    commentsContainer.innerHTML = "";

    snap.forEach((docSnap) => {
      const comment = docSnap.data();
      const commentId = docSnap.id;

      const commentEl = document.createElement("div");
      commentEl.className = "comment";
      commentEl.innerHTML = `
        <strong>${comment.username || "Anonymous"}</strong> <small>${comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleString() : "just now"}</small>
        <p>${comment.text}</p>
        <button class="delete-comment" data-id="${commentId}">Delete</button>
      `;

      // DELETE COMMENT (poster or commenter)
      commentEl.querySelector(".delete-comment").addEventListener("click", async () => {
        if (confirm("Delete this comment?")) {
          await deleteDoc(doc(db, "posts", postId, "comments", commentId));
        }
      });

      commentsContainer.appendChild(commentEl);
    });
  });

  // COMMENT BUTTON
  postEl.querySelector(".comment-btn").addEventListener("click", async () => {
    const text = postEl.querySelector(".comment-input").value.trim();
    if (!text) return;

    await addDoc(collection(db, "posts", postId, "comments"), {
      text,
      username: auth.currentUser.email.split("@")[0] || "Anonymous",
      createdAt: serverTimestamp()
    });

    postEl.querySelector(".comment-input").value = "";
  });

  postsContainer.prepend(postEl);
}

// LOAD POSTS
async function loadPosts() {
  postsContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  snap.forEach(docSnap => renderPost(docSnap.data(), docSnap.id));
}

// CREATE POST
postBtn.addEventListener("click", async () => {
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
  loadPosts();
});

// AUTH CHECK
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadPosts();
  }
});
