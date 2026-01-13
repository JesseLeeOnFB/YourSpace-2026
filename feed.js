console.log("🔥 feed.js loaded");

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// DOM
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const postImageUrl = document.getElementById("postImageUrl");
const publishPostBtn = document.getElementById("publishPostBtn");
const feedPostsContainer = document.getElementById("feedPostsContainer");
const trendingPost = document.getElementById("trendingPost");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn.addEventListener("click", async () => await auth.signOut());

let currentUser;
onAuthStateChanged(auth, (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;
  loadFeed();
  loadTrending();
});

// Publish post
publishPostBtn.addEventListener("click", async () => {
  const title = postTitle.value;
  const content = postContent.value;
  const imageUrl = postImageUrl.value;

  if (!title && !content) return alert("Enter a title or content!");

  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    username: currentUser.displayName || currentUser.email,
    title,
    content,
    imageUrl: imageUrl || "",
    timestamp: new Date(),
    likes: 0,
    comments: []
  });

  postTitle.value = "";
  postContent.value = "";
  postImageUrl.value = "";
  loadFeed();
  loadTrending();
});

// Load global feed
async function loadFeed() {
  feedPostsContainer.innerHTML = "";

  const postsSnapshot = await getDocs(query(collection(db, "posts"), orderBy("timestamp", "desc")));
  postsSnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postEl = document.createElement("div");
    postEl.classList.add("post");
    postEl.innerHTML = `
      <h4>${post.title}</h4>
      <p>${post.content}</p>
      ${post.imageUrl ? `<img src="${post.imageUrl}" width="200"/>` : ""}
      <p>By: ${post.username}</p>
      ${post.userId === currentUser.uid ? `<button onclick="deletePost('${docSnap.id}')">Delete</button>` : ""}
    `;
    feedPostsContainer.appendChild(postEl);
  });
}

// Delete post
window.deletePost = async (postId) => {
  const postRef = doc(db, "posts", postId);
  await deleteDoc(postRef);
  loadFeed();
  loadTrending();
}

// Load trending post (hourly)
async function loadTrending() {
  const postsSnapshot = await getDocs(query(collection(db, "posts"), orderBy("likes", "desc"), limit(1)));
  trendingPost.innerHTML = "";
  postsSnapshot.forEach(docSnap => {
    const post = docSnap.data();
    trendingPost.innerHTML = `
      <h4>${post.title}</h4>
      <p>${post.content}</p>
      ${post.imageUrl ? `<img src="${post.imageUrl}" width="200"/>` : ""}
      <p>By: ${post.username}</p>
    `;
  });
}
