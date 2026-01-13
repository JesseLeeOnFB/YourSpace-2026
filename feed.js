import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  const user = auth.currentUser;
  if (!user) return window.location.href = "index.html";

  // Navigation
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // Post creation
  postBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text) return alert("Write something first!");

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};

    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName: profile.displayName || user.email,
      photoURL: profile.photoURL || "",
      createdAt: serverTimestamp(),
      likes: 0,
      comments: [],
    });

    postInput.value = "";
  });

  // Display feed
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <img src="${data.photoURL || 'https://via.placeholder.com/50'}" class="post-pic">
        <p><strong>${data.displayName}</strong></p>
        <p>${data.text}</p>
        <button class="likeBtn">Like (${data.likes || 0})</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
      `;
      postsContainer.appendChild(postDiv);

      // Like functionality
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      });

      // Share functionality
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", () => {
        const shareUrl = window.location.href;
        const shareText = `${data.displayName} says: ${data.text}`;
        navigator.share ? navigator.share({ title: "YourSpace Post", text: shareText, url: shareUrl }) : alert("Copy link to share: " + shareUrl);
      });

      // Comment placeholder (can extend later)
      const commentBtn = postDiv.querySelector(".commentBtn");
      commentBtn.addEventListener("click", () => alert("Comments not implemented yet."));
    });
  });

  // Trending post every hour
  setInterval(async () => {
    const postsSnap = await getDoc(collection(db, "posts"));
    const postsArray = [];
    const querySnap = await getDocs(collection(db, "posts"));
    querySnap.forEach(docSnap => postsArray.push({ id: docSnap.id, ...docSnap.data() }));
    let topPost = null;
    postsArray.forEach(p => {
      if (!topPost || (p.likes || 0) > (topPost.likes || 0)) topPost = p;
    });
    trendingContainer.innerHTML = topPost ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})` : "No posts yet";
  }, 3600*1000);
});
