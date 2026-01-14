import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ----------------------
// Firebase config
// ----------------------
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
const storage = getStorage(app);

// ----------------------
// DOM Elements
// ----------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");

// ----------------------
// Auth check
// ----------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadFeed();
  }
});

// ----------------------
// Preview selected file
// ----------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;
  
  if (file.type.startsWith("image")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (file.type.startsWith("video")) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

// ----------------------
// Post creation
// ----------------------
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;

  let file = postFileInput.files[0];
  let postImageURL = "";
  let postVideoURL = "";

  try {
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
      }

      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("image")) postImageURL = downloadURL;
      if (contentType.startsWith("video")) postVideoURL = downloadURL;
    }

    const postData = {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || "Anonymous",
      profilePic: auth.currentUser.photoURL || "",
      text: postText.value || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      comments: []
    };

    await addDoc(collection(db, "posts"), postData);

    // Reset form
    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";

    loadFeed();
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
});

// ----------------------
// Load feed
// ----------------------
async function loadFeed() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post";

    postDiv.innerHTML = `
      <div class="postHeader">
        <img src="${post.profilePic || 'default-avatar.png'}" class="postProfilePic">
        <strong>${post.username}</strong>
      </div>
      <div class="postText">${post.text || ""}</div>
      ${post.postImage ? `<img src="${post.postImage}" class="postImage">` : ""}
      ${post.postVideo ? `<video src="${post.postVideo}" controls class="postVideo"></video>` : ""}
      <div class="postActions">
        <button class="likeBtn">👍 ${post.likes}</button>
        <button class="dislikeBtn">🖕 ${post.dislikes}</button>
        <button class="commentBtn">💬 Comment</button>
        <button class="shareBtn">Share</button>
        ${post.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
      </div>
      <div class="commentsContainer"></div>
    `;

    // Like button
    postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
      const postRef = doc(db, "posts", docSnap.id);
      await updateDoc(postRef, { likes: post.likes + 1 });
      loadFeed();
    });

    // Dislike button
    postDiv.querySelector(".dislikeBtn").addEventListener("click", async () => {
      const postRef = doc(db, "posts", docSnap.id);
      await updateDoc(postRef, { dislikes: post.dislikes + 1 });
      loadFeed();
    });

    // Delete button
    if (post.userId === auth.currentUser.uid) {
      postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await postRef.delete();
        loadFeed();
      });
    }

    // Comment button
    postDiv.querySelector(".commentBtn").addEventListener("click", () => {
      const commentText = prompt("Enter your comment:");
      if (!commentText) return;

      const postRef = doc(db, "posts", docSnap.id);
      updateDoc(postRef, { comments: arrayUnion({ username: auth.currentUser.displayName || "Anonymous", text: commentText }) })
        .then(() => loadFeed());
    });

    // Display comments
    const commentsContainer = postDiv.querySelector(".commentsContainer");
    post.comments.forEach(c => {
      const cDiv = document.createElement("div");
      cDiv.className = "comment";
      cDiv.textContent = `${c.username}: ${c.text}`;
      commentsContainer.appendChild(cDiv);
    });

    postsContainer.appendChild(postDiv);
  });
}
