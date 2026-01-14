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
  increment,
  arrayUnion,
  serverTimestamp
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
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Image/Video Preview -------------------- */
  postFileInput.onchange = () => {
    const file = postFileInput.files[0];
    if (!file) {
      imagePreview.style.display = "none";
      return;
    }

    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = "block";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach a file.");
      return;
    }

    postBtn.disabled = true;

    try {
      let postMediaURL = "";
      let mediaType = "";

      // Upload file if exists
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }
        mediaType = contentType.startsWith("image") ? "postImage" : "postVideo";
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        postMediaURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile
      const userSnap = await (await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")).getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create post in Firestore
      const postData = {
        text: text || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      };
      if (postMediaURL) postData[mediaType] = postMediaURL;

      await addDoc(collection(db, "posts"), postData);

      // Reset inputs
      postInput.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
      notifyEmail.checked = false;
      notifyBrowser.checked = false;

    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- LOAD FEED -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const post = document.createElement("div");
      post.className = "post";

      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postMedia">`;
      if (data.postVideo) mediaHTML = `<video src="${data.postVideo}" class="postMedia" controls></video>`;

      post.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postActions">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 Comment</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      // Like
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislike
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Delete
      const delBtn = post.querySelector(".deleteBtn");
      if (delBtn) delBtn.onclick = async () => {
        if (confirm("Delete post?")) await (await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")).deleteDoc(doc(db, "posts", docSnap.id));
      };

      // Comment
      const commentBtn = post.querySelector(".commentBtn");
      const commentsContainer = post.querySelector(".commentsContainer");
      commentBtn.onclick = () => {
        const commentBox = document.createElement("textarea");
        commentBox.placeholder = "Write a comment...";
        const submitBtn = document.createElement("button");
        submitBtn.textContent = "Post";
        commentsContainer.appendChild(commentBox);
        commentsContainer.appendChild(submitBtn);

        submitBtn.onclick = async () => {
          const commentText = commentBox.value.trim();
          if (!commentText) return;
          await updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, userId: user.uid, displayName: profile.displayName || "Anonymous" }) });
          commentBox.remove();
          submitBtn.remove();
        };
      };
    });
  });
});
