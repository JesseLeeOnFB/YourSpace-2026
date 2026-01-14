// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const postsContainer = document.getElementById("postsContainer");
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");
const postError = document.getElementById("postError");

// Navigation buttons
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// Preview selected image/video
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;

  const type = file.type;
  if (type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (type.startsWith("video/")) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  } else {
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
  }
});

// Post creation
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;
  postError.textContent = "";

  const text = postTextInput.value.trim();
  const file = postFileInput.files[0];

  let postImage = null;
  let postVideo = null;

  try {
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
      }

      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const fileURL = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("image/")) postImage = fileURL;
      if (contentType.startsWith("video/")) postVideo = fileURL;
    }

    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || "Anonymous",
      text: text || null,
      postImage,
      postVideo,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    });

    postTextInput.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";

    loadPosts();
  } catch (err) {
    console.error(err);
    postError.textContent = "Post creation failed. Check console.";
  } finally {
    postBtn.disabled = false;
  }
});

// Load posts
async function loadPosts() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.classList.add("post");

    const usernameDiv = document.createElement("div");
    usernameDiv.textContent = post.username || "Anonymous";

    const textDiv = document.createElement("div");
    textDiv.textContent = post.text || "";

    const contentDiv = document.createElement("div");
    if (post.postImage) {
      const img = document.createElement("img");
      img.src = post.postImage;
      img.style.maxWidth = "300px";
      img.style.maxHeight = "300px";
      contentDiv.appendChild(img);
    }
    if (post.postVideo) {
      const vid = document.createElement("video");
      vid.src = post.postVideo;
      vid.controls = true;
      vid.style.maxWidth = "300px";
      vid.style.maxHeight = "300px";
      contentDiv.appendChild(vid);
    }

    const actionsDiv = document.createElement("div");

    // Like button
    const likeBtn = document.createElement("button");
    likeBtn.textContent = "👍 " + post.likes;
    likeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
      loadPosts();
    });

    // Dislike button
    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = "🖕 " + post.dislikes;
    dislikeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { dislikes: (post.dislikes || 0) + 1 });
      loadPosts();
    });

    // Comment button
    const commentBtn = document.createElement("button");
    commentBtn.textContent = "💬 Comment";
    commentBtn.addEventListener("click", async () => {
      const comment = prompt("Enter your comment:");
      if (comment) {
        const newComments = post.comments || [];
        newComments.push({ userId: auth.currentUser.uid, username: auth.currentUser.displayName || "Anonymous", text: comment });
        await updateDoc(doc(db, "posts", postId), { comments: newComments });
        loadPosts();
      }
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    if (post.userId === auth.currentUser.uid) {
      deleteBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", postId));
        loadPosts();
      });
    } else {
      deleteBtn.disabled = true;
    }

    actionsDiv.append(likeBtn, dislikeBtn, commentBtn, deleteBtn);
    postDiv.append(usernameDiv, textDiv, contentDiv, actionsDiv);

    // Comments display
    const commentsDiv = document.createElement("div");
    if (post.comments && post.comments.length) {
      post.comments.forEach(c => {
        const cDiv = document.createElement("div");
        cDiv.textContent = `${c.username}: ${c.text}`;
        commentsDiv.appendChild(cDiv);
      });
    }
    postDiv.appendChild(commentsDiv);

    postsContainer.appendChild(postDiv);
  });
}

// Observe auth state
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
  else loadPosts();
});
