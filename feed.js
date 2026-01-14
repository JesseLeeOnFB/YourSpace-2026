// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// -------------------------
// Firebase config
// -------------------------
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

// -------------------------
// DOM Elements
// -------------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");

// -------------------------
// Navigation buttons
// -------------------------
document.getElementById("homeBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

// -------------------------
// Preview File
// -------------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (["jpg","jpeg","png","gif"].includes(ext)) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (["mp4","mov","webm"].includes(ext)) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

// -------------------------
// Auth check
// -------------------------
let currentUser = null;
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPosts();
  }
});

// -------------------------
// Load Posts
// -------------------------
async function loadPosts() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.classList.add("post");

    // Username
    const username = document.createElement("h4");
    username.textContent = post.username || "Anonymous";

    // Text
    const text = document.createElement("p");
    text.textContent = post.text || "";

    postDiv.appendChild(username);
    postDiv.appendChild(text);

    // Image
    if (post.postImage) {
      const img = document.createElement("img");
      img.src = post.postImage;
      img.style.maxWidth = "300px";
      img.style.maxHeight = "300px";
      postDiv.appendChild(img);
    }

    // Video
    if (post.postVideo) {
      const vid = document.createElement("video");
      vid.src = post.postVideo;
      vid.controls = true;
      vid.style.maxWidth = "300px";
      vid.style.maxHeight = "300px";
      postDiv.appendChild(vid);
    }

    // Buttons
    const btnContainer = document.createElement("div");
    btnContainer.classList.add("postButtons");

    // Like
    const likeBtn = document.createElement("button");
    likeBtn.textContent = "👍 " + (post.likes || 0);
    likeBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
      loadPosts();
    };
    btnContainer.appendChild(likeBtn);

    // Dislike
    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = "🖕 " + (post.dislikes || 0);
    dislikeBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { dislikes: (post.dislikes || 0) + 1 });
      loadPosts();
    };
    btnContainer.appendChild(dislikeBtn);

    // Comment
    const commentBtn = document.createElement("button");
    commentBtn.textContent = "💬";
    commentBtn.onclick = () => {
      const commentText = prompt("Enter comment:");
      if (commentText) {
        const newComments = post.comments || [];
        newComments.push({ text: commentText, username: currentUser.email });
        updateDoc(doc(db, "posts", postId), { comments: newComments });
        loadPosts();
      }
    };
    btnContainer.appendChild(commentBtn);

    // Share (placeholder)
    const shareBtn = document.createElement("button");
    shareBtn.textContent = "Share";
    shareBtn.onclick = () => alert("Share function not implemented yet.");
    btnContainer.appendChild(shareBtn);

    // Delete (only owner)
    if (post.userId === currentUser.uid) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        await deleteDoc(doc(db, "posts", postId));
        loadPosts();
      };
      btnContainer.appendChild(deleteBtn);
    }

    postDiv.appendChild(btnContainer);

    // Comments display
    if (post.comments && post.comments.length > 0) {
      const commentsDiv = document.createElement("div");
      commentsDiv.classList.add("comments");
      post.comments.forEach(c => {
        const cDiv = document.createElement("p");
        cDiv.textContent = `${c.username || "Anonymous"}: ${c.text}`;
        commentsDiv.appendChild(cDiv);
      });
      postDiv.appendChild(commentsDiv);
    }

    postsContainer.appendChild(postDiv);
  });
}

// -------------------------
// Create Post
// -------------------------
postBtn.onclick = async () => {
  if (!currentUser) return;
  postBtn.disabled = true;

  let postImageURL = null;
  let postVideoURL = null;

  const file = postFileInput.files[0];
  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("image")) postImageURL = downloadURL;
      if (contentType.startsWith("video")) postVideoURL = downloadURL;
    } catch(err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      postBtn.disabled = false;
      return;
    }
  }

  // Create post doc
  try {
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      username: currentUser.email, // or any username field
      text: postText.value || null,
      postImage: postImageURL,
      postVideo: postVideoURL,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    });

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";

    loadPosts();
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
};
