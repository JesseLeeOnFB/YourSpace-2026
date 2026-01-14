// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --- Firebase config ---
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

// DOM Elements
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --- Navigation ---
homeBtn.addEventListener("click", () => location.href = "feed.html");
profileBtn.addEventListener("click", () => location.href = "profile.html");
logoutBtn.addEventListener("click", () => auth.signOut().then(() => location.href = "index.html"));

// --- Auth state ---
let currentUser;
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  else {
    currentUser = user;
    loadPosts();
  }
});

// --- Image preview ---
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return imagePreview.style.display = "none";
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = "block";
});

// --- Post creation ---
postBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  postBtn.disabled = true;

  let file = postFileInput.files[0];
  let postImageURL = "";
  let postVideoURL = "";

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4", "mov", "webm"].includes(ext)) contentType = "video/mp4";
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

  try {
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      username: currentUser.email.split("@")[0], // fallback username
      text: postText.value || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      createdAt: Date.now(),
      likes: 0,
      dislikes: 0,
      comments: []
    });
    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    postBtn.disabled = false;
    loadPosts();
  } catch(err) {
    console.error(err);
    alert("Post creation failed. Check console.");
    postBtn.disabled = false;
  }
});

// --- Load posts ---
async function loadPosts() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const postsSnap = await getDocs(q);

  postsSnap.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const div = document.createElement("div");
    div.className = "post";

    // User info
    const userDiv = document.createElement("div");
    userDiv.className = "postUser";
    userDiv.textContent = post.username || "Anonymous";
    div.appendChild(userDiv);

    // Text
    if (post.text) {
      const textDiv = document.createElement("div");
      textDiv.className = "postText";
      textDiv.textContent = post.text;
      div.appendChild(textDiv);
    }

    // Image
    if (post.postImage) {
      const img = document.createElement("img");
      img.src = post.postImage;
      img.style.maxWidth = "300px";
      img.style.maxHeight = "300px";
      div.appendChild(img);
    }

    // Video
    if (post.postVideo) {
      const vid = document.createElement("video");
      vid.src = post.postVideo;
      vid.controls = true;
      vid.style.maxWidth = "300px";
      vid.style.maxHeight = "300px";
      div.appendChild(vid);
    }

    // Buttons: like, dislike, comment, share, delete
    const btnDiv = document.createElement("div");
    btnDiv.className = "postButtons";

    const likeBtn = document.createElement("button");
    likeBtn.textContent = `👍 ${post.likes || 0}`;
    likeBtn.onclick = async () => {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { likes: (post.likes || 0) + 1 });
      loadPosts();
    };
    btnDiv.appendChild(likeBtn);

    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = `🖕 ${post.dislikes || 0}`;
    dislikeBtn.onclick = async () => {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { dislikes: (post.dislikes || 0) + 1 });
      loadPosts();
    };
    btnDiv.appendChild(dislikeBtn);

    const commentBtn = document.createElement("button");
    commentBtn.textContent = "Comment";
    commentBtn.onclick = async () => {
      const comment = prompt("Enter your comment:");
      if (!comment) return;
      const postRef = doc(db, "posts", postId);
      const newComments = post.comments || [];
      newComments.push({ user: currentUser.email.split("@")[0], text: comment });
      await updateDoc(postRef, { comments: newComments });
      loadPosts();
    };
    btnDiv.appendChild(commentBtn);

    const shareBtn = document.createElement("button");
    shareBtn.textContent = "Share";
    shareBtn.onclick = () => alert("Share function not enabled yet");
    btnDiv.appendChild(shareBtn);

    // Delete (only if owner)
    if (post.userId === currentUser.uid) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", postId));
          loadPosts();
        }
      };
      btnDiv.appendChild(deleteBtn);
    }

    // Show comments
    if (post.comments && post.comments.length) {
      const commentsDiv = document.createElement("div");
      commentsDiv.className = "comments";
      post.comments.forEach(c => {
        const cDiv = document.createElement("div");
        cDiv.textContent = `${c.user || "Anonymous"}: ${c.text}`;
        commentsDiv.appendChild(cDiv);
      });
      div.appendChild(commentsDiv);
    }

    div.appendChild(btnDiv);
    postsContainer.appendChild(div);
  });
}
