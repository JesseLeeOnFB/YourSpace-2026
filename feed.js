import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const notifyEmailCheckbox = document.getElementById("notifyEmail");
const notifyBrowserCheckbox = document.getElementById("notifyBrowser");

// --- Auth check ---
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
});

// --- Create a post ---
postBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  postBtn.disabled = true;

  let postText = postTextInput.value.trim() || null;
  let postImage = null;
  let postVideo = null;

  try {
    const file = postFileInput.files[0];
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
        if (["mp4", "mov", "webm"].includes(ext)) contentType = "video/mp4";
      }

      const safeName = encodeURIComponent(file.name);
      let folder = contentType.startsWith("image") ? "posts" : "posts";
      const storageRef = ref(storage, `yourspace-2026.appspot.com/${folder}/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("image")) postImage = downloadURL;
      if (contentType.startsWith("video")) postVideo = downloadURL;
    }

    const postData = {
      userId: user.uid,
      username: user.displayName || user.email.split("@")[0],
      text: postText,
      postImage,
      postVideo,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    };

    await addDoc(collection(db, "posts"), postData);

    // Reset inputs
    postTextInput.value = "";
    postFileInput.value = "";

    alert("Post created!");
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
};

// --- Display posts in real-time ---
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(q, snapshot => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postId = docSnap.id;

    const postEl = document.createElement("div");
    postEl.classList.add("post");

    let html = `<p><strong>${data.username}</strong></p>`;
    if (data.text) html += `<p>${data.text}</p>`;
    if (data.postImage) html += `<img src="${data.postImage}" style="max-width:300px; max-height:300px;">`;
    if (data.postVideo) html += `<video controls style="max-width:300px; max-height:300px;"><source src="${data.postVideo}"></video>`;
    html += `
      <div class="postButtons">
        <button class="likeBtn">👍 ${data.likes}</button>
        <button class="dislikeBtn">🖕 ${data.dislikes}</button>
        <button class="commentBtn">💬</button>
        ${data.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
      </div>
      <div class="commentsContainer"></div>
    `;
    postEl.innerHTML = html;
    postsContainer.appendChild(postEl);

    const likeBtn = postEl.querySelector(".likeBtn");
    const dislikeBtn = postEl.querySelector(".dislikeBtn");
    const commentBtn = postEl.querySelector(".commentBtn");
    const deleteBtn = postEl.querySelector(".deleteBtn");
    const commentsContainer = postEl.querySelector(".commentsContainer");

    // Like
    likeBtn.onclick = async () => {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { likes: data.likes + 1 });
    };

    // Dislike
    dislikeBtn.onclick = async () => {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { dislikes: data.dislikes + 1 });
    };

    // Comment
    commentBtn.onclick = async () => {
      const commentText = prompt("Enter your comment:");
      if (!commentText) return;
      const postRef = doc(db, "posts", postId);
      const newComments = [...(data.comments || []), { userId: auth.currentUser.uid, text: commentText }];
      await updateDoc(postRef, { comments: newComments });
    };

    // Delete
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm("Delete this post?")) {
          const postRef = doc(db, "posts", postId);
          await postRef.delete();
        }
      };
    }

    // Render comments
    commentsContainer.innerHTML = "";
    (data.comments || []).forEach(c => {
      const commentEl = document.createElement("p");
      commentEl.textContent = `${c.text}`;
      commentsContainer.appendChild(commentEl);
    });
  });
});
