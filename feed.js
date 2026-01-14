// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* -------------------- DOM -------------------- */
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postFileInput = document.getElementById("postFileInput"); // image/video input
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Image Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, user => {
  if (!user) return window.location.href = "index.html";

  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach an image/video.");
      return;
    }

    postBtn.disabled = true;

    let postURL = "";
    let isVideo = false;

    try {
      // Upload file if exists
      if (file) {
        const ext = file.name.split(".").pop().toLowerCase();
        isVideo = ["mp4", "mov", "webm"].includes(ext);
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
        postURL = await getDownloadURL(snapshot.ref);
      }

      // Fallbacks for displayName & photoURL
      const displayName = typeof auth.currentUser.displayName === "string" ? auth.currentUser.displayName : "Anonymous";
      const photoURL = typeof auth.currentUser.photoURL === "string" ? auth.currentUser.photoURL : "";

      // Mentions detection (simple: words starting with @)
      const mentions = text.match(/@(\w+)/g) || [];

      // Firestore post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: !isVideo ? postURL || null : null,
        postVideo: isVideo ? postURL || null : null,
        userId: auth.currentUser.uid,
        displayName,
        photoURL,
        likes: 0,
        dislikes: 0,
        comments: [],
        shares: 0,
        mentions,
        createdAt: serverTimestamp()
      });

      // Reset
      postInput.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";

    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- FEED -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const post = document.createElement("div");
      post.className = "post";

      // Media HTML
      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postImage">`;
      if (data.postVideo) mediaHTML = `<video src="${data.postVideo}" class="postVideo" controls></video>`;

      post.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬 ${data.comments?.length || 0}</button>
          <button class="shareBtn">🔗 ${data.shares || 0}</button>
          ${data.userId === auth.currentUser.uid ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      // BUTTONS
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };
      post.querySelector(".dislikeBtn")?.onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };
      post.querySelector(".deleteBtn")?.onclick = async () => {
        if (confirm("Delete this post?")) await deleteDoc(doc(db, "posts", docSnap.id));
      };
      post.querySelector(".commentBtn")?.onclick = () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, user: auth.currentUser.uid }) });
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        post.querySelector(".commentsContainer").appendChild(commentEl);
      };
    });
  });
});
