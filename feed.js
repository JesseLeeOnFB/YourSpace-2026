import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------------
// Firebase Config
// ---------------------------
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

// ---------------------------
// DOM Elements
// ---------------------------
const postsContainer = document.getElementById("postsContainer");
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");

// ---------------------------
// Auth Check
// ---------------------------
onAuthStateChanged(auth, user => {
  if(!user) {
    window.location.href = "index.html";
  } else {
    loadPosts();
  }
});

// ---------------------------
// Load Posts
// ---------------------------
async function loadPosts() {
  postsContainer.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "posts"));
  querySnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;
    renderPost(post, postId);
  });
}

// ---------------------------
// Render Single Post
// ---------------------------
function renderPost(post, postId) {
  const postElement = document.createElement("div");
  postElement.classList.add("post");

  // Username
  const username = post.username || "Anonymous";
  const usernameEl = document.createElement("strong");
  usernameEl.textContent = username;
  postElement.appendChild(usernameEl);

  // Text
  if(post.text) {
    const textEl = document.createElement("p");
    textEl.textContent = post.text;
    postElement.appendChild(textEl);
  }

  // Image
  if(post.postImage) {
    const img = document.createElement("img");
    img.src = post.postImage;
    img.classList.add("postImage");
    postElement.appendChild(img);
  }

  // Video
  if(post.postVideo) {
    const vid = document.createElement("video");
    vid.src = post.postVideo;
    vid.controls = true;
    vid.classList.add("postVideo");
    postElement.appendChild(vid);
  }

  // Buttons
  const buttonsDiv = document.createElement("div");
  buttonsDiv.classList.add("postButtons");

  // Like
  const likeBtn = document.createElement("button");
  likeBtn.textContent = `👍 ${post.likes || 0}`;
  likeBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { likes: (post.likes || 0) + 1 });
    loadPosts();
  };
  buttonsDiv.appendChild(likeBtn);

  // Dislike
  const dislikeBtn = document.createElement("button");
  dislikeBtn.textContent = `🖕 ${post.dislikes || 0}`;
  dislikeBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { dislikes: (post.dislikes || 0) + 1 });
    loadPosts();
  };
  buttonsDiv.appendChild(dislikeBtn);

  // Comment (popup prompt)
  const commentBtn = document.createElement("button");
  commentBtn.textContent = "💬";
  commentBtn.onclick = async () => {
    const commentText = prompt("Enter comment:");
    if(commentText) {
      const newComments = post.comments ? [...post.comments, { username: auth.currentUser.displayName || "Anonymous", text: commentText }] : [{ username: auth.currentUser.displayName || "Anonymous", text: commentText }];
      await updateDoc(doc(db, "posts", postId), { comments: newComments });
      loadPosts();
    }
  };
  buttonsDiv.appendChild(commentBtn);

  // Delete
  if(post.userId === auth.currentUser.uid) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = async () => {
      await deleteDoc(doc(db, "posts", postId));
      loadPosts();
    };
    buttonsDiv.appendChild(deleteBtn);
  }

  postElement.appendChild(buttonsDiv);

  // Display Comments
  if(post.comments) {
    const commentsDiv = document.createElement("div");
    commentsDiv.classList.add("comments");
    post.comments.forEach(c => {
      const cEl = document.createElement("div");
      cEl.classList.add("comment");
      cEl.innerHTML = `<strong>${c.username}</strong>: ${c.text}`;
      commentsDiv.appendChild(cEl);
    });
    postElement.appendChild(commentsDiv);
  }

  postsContainer.appendChild(postElement);
}

// ---------------------------
// Create New Post
// ---------------------------
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;

  let postImageURL = "";
  let postVideoURL = "";
  const file = postFileInput.files[0];

  if(file) {
    let contentType = file.type;
    if(!contentType) {
      const ext = file.name.split(".").pop().toLowerCase();
      if(["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if(["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      if(contentType.startsWith("image")) postImageURL = downloadURL;
      if(contentType.startsWith("video")) postVideoURL = downloadURL;
    } catch(err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      postBtn.disabled = false;
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || "Anonymous",
      text: postTextInput.value || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: serverTimestamp()
    });
    postTextInput.value = "";
    postFileInput.value = "";
    loadPosts();
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});
