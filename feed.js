// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

// DOM Elements
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

// Navigation buttons
document.getElementById("homeBtn").addEventListener("click", () => location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  location.href = "index.html";
});

// Current user data
let currentUserData = null;
onAuthStateChanged(auth, async user => {
  if (!user) location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  currentUserData = userSnap.exists() ? userSnap.data() : { username: "Anonymous" };

  loadPosts();
});

// Load all posts
async function loadPosts() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    // Build post media
    let mediaHTML = "";
    if (post.postImage) mediaHTML = `<img src="${post.postImage}" class="postMedia">`;
    if (post.postVideo) mediaHTML = `<video src="${post.postVideo}" controls class="postMedia"></video>`;

    // Build comments
    let commentsHTML = "";
    if (post.comments && post.comments.length > 0) {
      commentsHTML = `<div class="comments">
        ${post.comments.map(c => `<div><strong>${c.username}:</strong> ${c.text}</div>`).join("")}
      </div>`;
    }

    // Build post element
    const postEl = document.createElement("div");
    postEl.className = "post";
    postEl.innerHTML = `
      <div class="postHeader"><strong>${post.username || "Anonymous"}</strong></div>
      <div class="postText">${post.text || ""}</div>
      ${mediaHTML}
      <div class="postActions">
        <button class="likeBtn">👍 ${post.likes || 0}</button>
        <button class="dislikeBtn">🖕 ${post.dislikes || 0}</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
        ${post.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
      </div>
      ${commentsHTML}
    `;
    postsContainer.appendChild(postEl);

    // Event listeners
    const likeBtn = postEl.querySelector(".likeBtn");
    const dislikeBtn = postEl.querySelector(".dislikeBtn");
    const commentBtn = postEl.querySelector(".commentBtn");
    const deleteBtn = postEl.querySelector(".deleteBtn");
    const shareBtn = postEl.querySelector(".shareBtn");

    likeBtn?.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
      loadPosts();
    });

    dislikeBtn?.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { dislikes: (post.dislikes || 0) + 1 });
      loadPosts();
    });

    commentBtn?.addEventListener("click", async () => {
      const commentText = prompt("Enter your comment:");
      if (!commentText) return;
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const username = userSnap.exists() ? userSnap.data().username : "Anonymous";
      const newComments = post.comments ? [...post.comments, { username, text: commentText }] : [{ username, text: commentText }];
      await updateDoc(doc(db, "posts", postId), { comments: newComments });
      loadPosts();
    });

    deleteBtn?.addEventListener("click", async () => {
      if (confirm("Delete this post?")) {
        await deleteDoc(doc(db, "posts", postId));
        loadPosts();
      }
    });

    shareBtn?.addEventListener("click", async () => {
      try {
        const shareData = {
          title: "YourSpace Post",
          text: post.text || "",
          url: window.location.href
        };
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
          alert("Post copied to clipboard!");
        }
      } catch (err) {
        console.error("Share failed:", err);
        alert("Sharing failed. Try again.");
      }
    });
  });
}

// Create new post
postBtn.addEventListener("click", async () => {
  const text = postTextInput.value.trim();
  const file = postFileInput.files[0];
  postBtn.disabled = true;

  let postImageURL = "";
  let postVideoURL = "";

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4", "mov", "webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (contentType.startsWith("image")) postImageURL = downloadURL;
      if (contentType.startsWith("video")) postVideoURL = downloadURL;
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      postBtn.disabled = false;
      return;
    }
  }

  const userRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  const username = userSnap.exists() ? userSnap.data().username : "Anonymous";

  try {
    await addDoc(collection(db, "posts"), {
      text: text || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      userId: auth.currentUser.uid,
      username: username,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    });
    postTextInput.value = "";
    postFileInput.value = "";
    loadPosts();
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
});
