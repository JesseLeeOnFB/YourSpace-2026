// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, orderBy, getDoc
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

// LOGOUT BUTTON (FIXED)
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// GET DISPLAY USERNAME
async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username
      ? snap.data().username
      : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// RENDER POST
async function renderPost(postData, postId) {
  const postEl = document.createElement("div");
  postEl.className = "post-container";

  const username = await getUsername(postData.userId);

  let mediaHTML = "";
  if (postData.mediaType === "image") {
    mediaHTML = `<img src="${postData.mediaURL}" class="post-media">`;
  } else if (postData.mediaType === "video") {
    mediaHTML = `<video controls class="post-media"><source src="${postData.mediaURL}"></video>`;
  }

  postEl.innerHTML = `
    <div class="post-header">
      <span class="post-username">${username}</span>
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
  `;

  // DELETE POST
  postEl.querySelector(".delete-post")?.addEventListener("click", async () => {
    await deleteDoc(doc(db, "posts", postId));
    postEl.remove();
  });

  // LIKE
  postEl.querySelector(".like-btn").addEventListener("click", async () => {
    const newLikes = (postData.likes || 0) + 1;
    await updateDoc(doc(db, "posts", postId), { likes: newLikes });
    postEl.querySelector(".like-btn").textContent = `👍 ${newLikes}`;
  });

  // DISLIKE
  postEl.querySelector(".dislike-btn").addEventListener("click", async () => {
    const newDislikes = (postData.dislikes || 0) + 1;
    await updateDoc(doc(db, "posts", postId), { dislikes: newDislikes });
    postEl.querySelector(".dislike-btn").textContent = `🖕 ${newDislikes}`;
  });

  // SHARE
  postEl.querySelector(".share-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied");
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
