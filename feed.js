// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Elements
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

// Nav buttons
document.getElementById("homeBtn").addEventListener("click", () => location.reload());
document.getElementById("profileBtn")?.addEventListener("click", () => location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth).then(() => location.href = "index.html"));

// Preview selected image/video
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// Ensure user is logged in
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  else loadPosts();
});

// Create Post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  let postImageURL = null;
  let postVideoURL = null;

  const file = postFileInput.files[0];
  try {
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
      }

      const folder = contentType.startsWith("video") ? "posts" : "posts";
      const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const url = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("video")) postVideoURL = url;
      else postImageURL = url;
    }

    const text = postText.value.trim() || null;
    const newPost = {
      userId: user.uid,
      text,
      postImage: postImageURL,
      postVideo: postVideoURL,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "posts"), newPost);

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    postBtn.disabled = false;
    postBtn.textContent = "Post";

    loadPosts();
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
});

// Load posts
async function loadPosts() {
  postsContainer.innerHTML = "";
  const snapshot = await getDocs(collection(db, "posts"));
  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    let contentHTML = `<p>${post.text || ""}</p>`;
    if (post.postImage) contentHTML += `<img src="${post.postImage}" style="max-width:300px; max-height:300px;">`;
    if (post.postVideo) contentHTML += `<video controls style="max-width:300px; max-height:300px;"><source src="${post.postVideo}"></video>`;

    contentHTML += `
      <div class="postActions">
        <button class="likeBtn">👍 ${post.likes || 0}</button>
        <button class="dislikeBtn">🖕 ${post.dislikes || 0}</button>
        <button class="commentBtn">💬 ${post.comments?.length || 0}</button>
        <button class="shareBtn">Share</button>
        ${post.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
      </div>
      <div class="commentsContainer"></div>
    `;

    postDiv.innerHTML = contentHTML;
    postsContainer.prepend(postDiv);

    const commentsContainer = postDiv.querySelector(".commentsContainer");

    // Comment button
    postDiv.querySelector(".commentBtn").addEventListener("click", async () => {
      const commentText = prompt("Enter your comment:");
      if (!commentText) return;
      const commentObj = {
        userId: auth.currentUser.uid,
        text: commentText,
        createdAt: serverTimestamp()
      };
      await updateDoc(doc(db, "posts", postId), {
        comments: arrayUnion(commentObj)
      });
      loadPosts();
    });

    // Like button
    postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), {
        likes: (post.likes || 0) + 1
      });
      loadPosts();
    });

    // Dislike button
    postDiv.querySelector(".dislikeBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), {
        dislikes: (post.dislikes || 0) + 1
      });
      loadPosts();
    });

    // Delete button
    postDiv.querySelector(".deleteBtn")?.addEventListener("click", async () => {
      if (confirm("Delete this post?")) {
        await updateDoc(doc(db, "posts", postId), { deleted: true });
        loadPosts();
      }
    });

    // Share button
    postDiv.querySelector(".shareBtn").addEventListener("click", () => {
      alert("Share functionality not yet enabled.");
    });
  });
}
