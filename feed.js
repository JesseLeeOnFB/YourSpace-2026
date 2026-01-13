console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, serverTimestamp, query, orderBy, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
const postsContainer = document.getElementById("postsContainer");
const trendingPostDiv = document.getElementById("trendingPost");

const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

profileBtn.addEventListener("click", () => { window.location.href = "profile.html"; });
logoutBtn.addEventListener("click", async () => { await auth.signOut(); window.location.href = "index.html"; });

// Create post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");
  const text = postInput.value.trim();
  if (!text) return alert("Write something first");

  try {
    // Load user profile
    const userDoc = await getDocs(collection(db, "users"));
    let displayName = user.email;
    let photoURL = "";
    
    const docRef = doc(db, "users", user.uid);
    const docSnap = await docRef.get ? await docRef.get() : await getDocs(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      displayName = docSnap.data().displayName || user.email;
      photoURL = docSnap.data().photoURL || "";
    }

    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName,
      photoURL,
      likes: 0,
      comments: [],
      createdAt: serverTimestamp()
    });

    postInput.value = "";
    loadPosts();
  } catch (err) {
    console.error("POST ERROR:", err);
    alert(err.message);
  }
});

// Load posts
async function loadPosts() {
  postsContainer.innerHTML = "";
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const querySnap = await getDocs(postsQuery);

  let topPost = { likes: -1, element: null };

  querySnap.forEach((docSnap) => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
      <div class="postHeader">
        <img src="${post.photoURL || 'https://via.placeholder.com/50'}" class="postProfilePic">
        <strong>${post.displayName || post.userId}</strong>
      </div>
      <p>${post.text}</p>
      <button class="likeBtn">Like (${post.likes})</button>
      <button class="deleteBtn">Delete</button>
      <div class="commentsSection"></div>
    `;

    // Like button
    postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
      loadPosts();
    });

    // Delete button
    postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
      const user = auth.currentUser;
      if (user.uid !== post.userId) return alert("Cannot delete someone else's post");
      await deleteDoc(doc(db, "posts", postId));
      loadPosts();
    });

    postsContainer.appendChild(postDiv);

    if (post.likes > (topPost.likes || 0)) {
      topPost = { likes: post.likes, element: postDiv.cloneNode(true) };
    }
  });

  trendingPostDiv.innerHTML = "";
  if (topPost.element) trendingPostDiv.appendChild(topPost.element);
}

// Refresh posts every minute
setInterval(loadPosts, 60000);
onAuthStateChanged(auth, (user) => { if (!user) window.location.href = "index.html"; loadPosts(); });
