console.log("🔥 feed.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const logoutBtn = document.getElementById("logoutBtn");
const goProfileBtn = document.getElementById("goProfileBtn");
const createPostBtn = document.getElementById("createPostBtn");

const postTitleInput = document.getElementById("postTitle");
const postContentInput = document.getElementById("postContent");
const imageURLInput = document.getElementById("imageURL");

const feedContainer = document.getElementById("feedContainer");
const trendingContainer = document.getElementById("trendingContainer");

// Logout button
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
  window.location.href = "index.html";
});

// Go to profile
goProfileBtn.addEventListener("click", () => {
  window.location.href = "profile.html";
});

// Create a post
createPostBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to post!");

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  const imageURL = imageURLInput.value.trim();

  if (!title && !content) return alert("Please add a title or content!");

  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username: user.email.split("@")[0], // fallback for username
    title,
    content,
    imageURL,
    createdAt: new Date(),
    likes: 0,
    comments: 0,
    shares: 0
  });

  postTitleInput.value = "";
  postContentInput.value = "";
  imageURLInput.value = "";

  alert("Post created!");
  loadFeed();
});

// Load all posts in global feed
async function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  feedContainer.innerHTML = "";
  let trendingPost = null;
  let maxScore = -1;

  querySnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postEl = document.createElement("div");
    postEl.classList.add("post");
    postEl.innerHTML = `
      <h3>${post.title || "(No title)"}</h3>
      <p>${post.content}</p>
      ${post.imageURL ? `<img src="${post.imageURL}" style="max-width:100%;">` : ""}
      <small>by ${post.username}</small>
    `;
    feedContainer.appendChild(postEl);

    // Simple trending score = likes + comments + shares
    const score = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    if (score > maxScore) {
      maxScore = score;
      trendingPost = post;
    }
  });

  // Show trending
  if (trendingPost) {
    trendingContainer.innerHTML = `
      <h3>${trendingPost.title || "(No title)"}</h3>
      <p>${trendingPost.content}</p>
      ${trendingPost.imageURL ? `<img src="${trendingPost.imageURL}" style="max-width:100%;">` : ""}
      <small>by ${trendingPost.username}</small>
    `;
  }
}

// Load feed on auth state
auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "index.html";
  else loadFeed();
});
