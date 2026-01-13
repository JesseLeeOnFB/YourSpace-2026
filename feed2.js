// feed2.js
console.log("🔥 feed2.js loaded");
import { getStorage, ref, uploadBytes, getDownloadURL } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const storage = getStorage(app);

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {

  // DOM Elements
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // Nav buttons
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // Create Post
  postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first");

  const text = postInput.value.trim();
  const imageFile = document.getElementById("postImage").files[0];

  if (!text && !imageFile) {
    alert("Write something or add an image");
    return;
  }

  let imageURL = "";

  try {
    // Upload image if exists
    if (imageFile) {
      const imageRef = ref(
        storage,
        `postImages/${user.uid}/${Date.now()}_${imageFile.name}`
      );
      await uploadBytes(imageRef, imageFile);
      imageURL = await getDownloadURL(imageRef);
    }

    // Load user profile
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};

    await addDoc(collection(db, "posts"), {
      text,
      imageURL,
      userId: user.uid,
      displayName: profile.displayName || user.email,
      photoURL: profile.photoURL || "",
      createdAt: serverTimestamp(),
      likes: 0,
      comments: []
    });

    postInput.value = "";
    document.getElementById("postImage").value = "";
  } catch (err) {
    console.error(err);
    alert("Post failed: " + err.message);
  }
});

  // Display Feed
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.displayName}</strong></p>
        <p>${data.text}</p>
        <button class="likeBtn">Like (${data.likes || 0})</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
        <button class="deleteBtn">Delete</button>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      // --- BUTTONS FOR EACH POST ---
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      });

      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        const updatedComments = [...(data.comments || []), { text: commentText, user: auth.currentUser.uid }];
        await updateDoc(postRef, { comments: updatedComments });
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      });

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });

      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({
            title: "YourSpace Post",
            text: data.text,
            url: window.location.href
          });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      });

      // Render existing comments
      const commentsContainerExisting = postDiv.querySelector(".commentsContainer");
      if (data.comments && data.comments.length) {
        data.comments.forEach(c => {
          const cEl = document.createElement("p");
          cEl.textContent = c.text;
          commentsContainerExisting.appendChild(cEl);
        });
      }

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
  }, 3600*1000); // every hour

});
