// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// -------------------
// Firebase config
// -------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// -------------------
// DOM elements
// -------------------
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

// -------------------
// Auth state
// -------------------
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "index.html";
});

// -------------------
// Post creation
// -------------------
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;

  let file = postFileInput.files[0];
  let postImageURL = null;
  let postVideoURL = null;

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
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
      userId: auth.currentUser.uid,
      text: postText.value || null,
      postImage: postImageURL,
      postVideo: postVideoURL,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date(),
      notifications: {
        email: notifyEmail.checked,
        browser: notifyBrowser.checked
      }
    });
    postText.value = "";
    postFileInput.value = "";
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});

// -------------------
// Render posts
// -------------------
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, (snapshot) => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postId = docSnap.id;

    const postEl = document.createElement("div");
    postEl.classList.add("post");

    // Text
    if (data.text) postEl.innerHTML += `<p>${data.text}</p>`;

    // Image
    if (data.postImage) postEl.innerHTML += `<img src="${data.postImage}" style="max-width:400px; max-height:400px;">`;

    // Video
    if (data.postVideo) postEl.innerHTML += `<video src="${data.postVideo}" controls style="max-width:400px; max-height:400px;"></video>`;

    // Buttons
    postEl.innerHTML += `
      <div class="postBtns">
        <button class="likeBtn">👍 ${data.likes}</button>
        <button class="dislikeBtn">🖕 ${data.dislikes}</button>
        <button class="commentBtn">💬</button>
        <button class="shareBtn">Share</button>
        ${data.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
      </div>
      <div class="commentsContainer"></div>
    `;

    // Append
    postsContainer.appendChild(postEl);

    // Button events
    const likeBtn = postEl.querySelector(".likeBtn");
    likeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (data.likes || 0) + 1 });
    });

    const dislikeBtn = postEl.querySelector(".dislikeBtn");
    dislikeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { dislikes: (data.dislikes || 0) + 1 });
    });

    const deleteBtn = postEl.querySelector(".deleteBtn");
    if (deleteBtn) deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this post?")) await doc(db, "posts", postId).delete();
    });

    const commentBtn = postEl.querySelector(".commentBtn");
    const commentsContainer = postEl.querySelector(".commentsContainer");
    commentBtn.addEventListener("click", async () => {
      const comment = prompt("Enter your comment:");
      if (comment) {
        const newComments = data.comments || [];
        newComments.push({ text: comment, userId: auth.currentUser.uid, createdAt: new Date() });
        await updateDoc(doc(db, "posts", postId), { comments: newComments });
      }
    });

    // Render comments
    if (data.comments && data.comments.length) {
      commentsContainer.innerHTML = "";
      data.comments.forEach(c => {
        const cEl = document.createElement("p");
        cEl.textContent = `${c.userId}: ${c.text}`;
        commentsContainer.appendChild(cEl);
      });
    }
  });
});
