// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase config
// ---------------------
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

// ---------------------
// DOM Elements
// ---------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

// ---------------------
// Auth check
// ---------------------
let currentUser;
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadFeed();
  }
});

// ---------------------
// Post button
// ---------------------
postBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  postBtn.disabled = true;

  try {
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

      const fileRefPath = file.type.startsWith("video/") ? 
                          `posts/${currentUser.uid}/videos/${Date.now()}_${file.name}` : 
                          `posts/${currentUser.uid}/${Date.now()}_${file.name}`;

      const fileRef = ref(storage, fileRefPath);
      const snapshot = await uploadBytes(fileRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (file.type.startsWith("video/")) postVideoURL = downloadURL;
      else postImageURL = downloadURL;
    }

    // Save to Firestore
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      text: postText.value || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date(),
      notifyEmail: notifyEmail.checked || false,
      notifyBrowser: notifyBrowser.checked || false
    });

    postText.value = "";
    postFileInput.value = "";
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
});

// ---------------------
// Load feed
// ---------------------
function loadFeed() {
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      let postHTML = `<p>${data.text || ""}</p>`;

      if (data.postImage) postHTML += `<img src="${data.postImage}" style="max-width:300px; max-height:300px;">`;
      if (data.postVideo) postHTML += `<video src="${data.postVideo}" controls style="max-width:300px; max-height:300px;"></video>`;

      postHTML += `
        <div class="postActions">
          <button class="likeBtn">👍 ${data.likes}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes}</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">Share</button>
          ${data.userId === currentUser.uid ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postDiv.innerHTML = postHTML;
      postsContainer.appendChild(postDiv);

      // Event listeners
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: data.likes + 1 });
      });

      const dislikeBtn = postDiv.querySelector(".dislikeBtn");
      dislikeBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: data.dislikes + 1 });
      });

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) deleteBtn.addEventListener("click", async () => {
        await doc(db, "posts", docSnap.id).delete();
      });

      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", () => {
        const commentText = prompt("Enter your comment:");
        if (commentText) {
          const newComments = [...(data.comments || []), { userId: currentUser.uid, text: commentText }];
          updateDoc(doc(db, "posts", docSnap.id), { comments: newComments });
        }
      });

      // Render comments
      (data.comments || []).forEach(c => {
        const commentEl = document.createElement("p");
        commentEl.textContent = `${c.userId}: ${c.text}`;
        commentsContainer.appendChild(commentEl);
      });
    });
  });
}
