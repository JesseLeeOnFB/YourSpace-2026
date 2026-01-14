// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const postsContainer = document.getElementById("postsContainer");

// --- Helper: get user data ---
async function getUserData(uid) {
  const userDoc = await doc(db, "users", uid).get();
  if (!userDoc.exists) return { username: "Anonymous", profilePic: "" };
  const data = userDoc.data();
  return {
    username: data.username || "Anonymous",
    profilePic: data.profilePic || ""
  };
}

// --- Upload file helper ---
async function uploadFile(file, uid) {
  let contentType = file.type;
  if (!contentType) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
    if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
  }

  const storageRef = ref(storage, `posts/${uid}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(snapshot.ref);
}

// --- Create post ---
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");
  postBtn.disabled = true;

  let file = postFileInput.files[0];
  let postImage = null;
  let postVideo = null;

  try {
    if (file) {
      const downloadURL = await uploadFile(file, auth.currentUser.uid);
      if (file.type.startsWith("image")) postImage = downloadURL;
      if (file.type.startsWith("video")) postVideo = downloadURL;
    }

    const postData = {
      userId: auth.currentUser.uid,
      text: postText.value || null,
      postImage: postImage,
      postVideo: postVideo,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    };

    await addDoc(collection(db, "posts"), postData);

    postText.value = "";
    postFileInput.value = "";
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});

// --- Render a post ---
async function renderPost(postDoc) {
  const postData = postDoc.data();
  const { username, profilePic } = await getUserData(postData.userId);

  const postEl = document.createElement("div");
  postEl.classList.add("post");

  // Username and profile pic
  postEl.innerHTML = `
    <div class="postHeader">
      <img src="${profilePic || 'defaultProfile.png'}" class="postProfilePic">
      <span class="postUsername">${username}</span>
      <span class="postTimestamp">${postData.createdAt.toDate().toLocaleString()}</span>
    </div>
    <div class="postContent">
      ${postData.text ? `<p>${postData.text}</p>` : ""}
      ${postData.postImage ? `<img src="${postData.postImage}" class="postMedia">` : ""}
      ${postData.postVideo ? `<video src="${postData.postVideo}" controls class="postMedia"></video>` : ""}
    </div>
    <div class="postActions">
      <button class="likeBtn">👍 ${postData.likes || 0}</button>
      <button class="dislikeBtn">🖕 ${postData.dislikes || 0}</button>
      <button class="commentBtn">Comment</button>
      <button class="shareBtn">Share</button>
      ${auth.currentUser.uid === postData.userId ? `<button class="deleteBtn">Delete</button>` : ""}
    </div>
    <div class="commentsContainer"></div>
  `;

  // --- Actions ---
  const likeBtn = postEl.querySelector(".likeBtn");
  likeBtn.addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postDoc.id), { likes: (postData.likes || 0) + 1 });
  });

  const dislikeBtn = postEl.querySelector(".dislikeBtn");
  dislikeBtn.addEventListener("click", async () => {
    await updateDoc(doc(db, "posts", postDoc.id), { dislikes: (postData.dislikes || 0) + 1 });
  });

  const commentBtn = postEl.querySelector(".commentBtn");
  commentBtn.addEventListener("click", async () => {
    const commentText = prompt("Enter comment:");
    if (!commentText) return;
    const commentObj = {
      text: commentText,
      userId: auth.currentUser.uid,
      createdAt: new Date()
    };
    const updatedComments = postData.comments || [];
    updatedComments.push(commentObj);
    await updateDoc(doc(db, "posts", postDoc.id), { comments: updatedComments });
  });

  const shareBtn = postEl.querySelector(".shareBtn");
  shareBtn.addEventListener("click", () => {
    const postURL = `${window.location.origin}/feed.html?postId=${postDoc.id}`;
    prompt("Copy post link:", postURL);
  });

  const deleteBtn = postEl.querySelector(".deleteBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this post?")) {
        await deleteDoc(doc(db, "posts", postDoc.id));
      }
    });
  }

  // --- Render comments ---
  const commentsContainer = postEl.querySelector(".commentsContainer");
  if (postData.comments && postData.comments.length) {
    for (let c of postData.comments) {
      const { username: cUser, profilePic: cPic } = await getUserData(c.userId);
      const cEl = document.createElement("div");
      cEl.classList.add("comment");
      cEl.innerHTML = `<img src="${cPic || 'defaultProfile.png'}" class="commentProfilePic">
                        <span class="commentUsername">${cUser}</span>
                        <span class="commentText">${c.text}</span>`;
      commentsContainer.appendChild(cEl);
    }
  }

  postsContainer.prepend(postEl);
}

// --- Listen for posts ---
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, snapshot => {
  postsContainer.innerHTML = "";
  snapshot.forEach(doc => renderPost(doc));
});

// --- Navigation ---
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});
