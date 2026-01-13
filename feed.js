import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc
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

document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // Create Post
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");
    const text = postInput.value.trim();
    if (!text) return alert("Write something first!");

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "posts"), {
        text,
        userId: user.uid,
        displayName: profile.displayName || user.email,
        photoURL: profile.photoURL || "",
        createdAt: serverTimestamp(),
        likes: 0,
        comments: []
      });

      postInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Error posting: " + err.message);
    }
  });

  // Display Feed
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(async docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      let commentsHTML = "";
      if (data.comments && data.comments.length > 0) {
        commentsHTML = "<div class='comments'>";
        data.comments.forEach(c => {
          commentsHTML += `<p><strong>${c.user}</strong>: ${c.text}</p>`;
        });
        commentsHTML += "</div>";
      }

      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-profile.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text}</p>
        <div class="postButtons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          ${auth.currentUser?.uid === data.userId ? "<button class='deleteBtn'>Delete</button>" : ""}
        </div>
        ${commentsHTML}
      `;
      postsContainer.appendChild(postDiv);

      // Like
      postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      });

      // Comment
      postDiv.querySelector(".commentBtn").addEventListener("click", async () => {
        const commentText = prompt("Write a comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { comments: [...(data.comments || []), { user: auth.currentUser.displayName || auth.currentUser.email, text: commentText }] });
      });

      // Delete
      if (auth.currentUser?.uid === data.userId) {
        postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        });
      }

      // Share (external link)
      postDiv.querySelector(".shareBtn").addEventListener("click", () => {
        const shareURL = `${window.location.origin}/feed.html#post=${docSnap.id}`;
        prompt("Copy this link to share:", shareURL);
      });
    });
  });

  // Trending Post - top liked in last hour
  setInterval(async () => {
    const postsSnap = await getDocs(collection(db, "posts"));
    let topPost = null;
    postsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!topPost || (data.likes || 0) > (topPost.likes || 0)) topPost = data;
    });
    trendingContainer.innerHTML = topPost ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})` : "No posts yet";
  }, 3600*1000);
});
