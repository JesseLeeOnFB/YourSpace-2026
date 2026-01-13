import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const trendingContainer = document.getElementById("trendingPost");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// Redirect if not logged in
onAuthStateChanged(auth, user => {
  if (!user) {
    alert("You must be logged in!");
    window.location.href = "index.html";
  }
});

// Nav buttons
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
      comments: [],
    });

    postInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error posting: " + err.message);
  }
});

// Display Feed & attach like/comment/delete/share functionality
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, snapshot => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.classList.add("post");
    postDiv.dataset.postId = docSnap.id;

    postDiv.innerHTML = `
      <p><strong>${data.displayName}</strong></p>
      <p>${data.text}</p>
      <div>
        <button class="likeBtn">Like (${data.likes || 0})</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
        ${data.userId === auth.currentUser.uid ? '<button class="deleteBtn">Delete</button>' : ''}
      </div>
      <div class="commentsContainer"></div>
    `;

    // Likes
    postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
      const postRef = doc(db, "posts", docSnap.id);
      await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
    });

    // Delete
    const delBtn = postDiv.querySelector(".deleteBtn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });
    }

    // Comment
    const commentBtn = postDiv.querySelector(".commentBtn");
    const commentsContainer = postDiv.querySelector(".commentsContainer");
    commentBtn.addEventListener("click", async () => {
      const commentText = prompt("Enter your comment:");
      if (!commentText) return;
      const postRef = doc(db, "posts", docSnap.id);
      const updatedComments = [...(data.comments || []), { text: commentText, user: auth.currentUser.uid }];
      await updateDoc(postRef, { comments: updatedComments });
    });

    postsContainer.appendChild(postDiv);
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
}, 3600 * 1000); // every hour
