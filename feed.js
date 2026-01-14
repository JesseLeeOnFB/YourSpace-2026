import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy,
  onSnapshot, doc, updateDoc, deleteDoc,
  serverTimestamp, increment, arrayUnion
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
const postMediaInput = document.getElementById("postMediaInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Image/Video Preview -------------------- */
postMediaInput.addEventListener("change", () => {
  const file = postMediaInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, (user) => {
  if (!user) return window.location.href = "index.html";

  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => { await signOut(auth); window.location.href = "index.html"; };

  /* -------------------- Create Post -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postMediaInput.files[0];
    if (!text && !file) return alert("Add text or media to post.");

    postBtn.disabled = true;

    let postURL = "";
    let isVideo = false;

    try {
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);

        // Only allow image or video
        if (!(file.type.startsWith("image/") || file.type.startsWith("video/"))) {
          alert("Only images/videos allowed.");
          postBtn.disabled = false;
          return;
        }

        isVideo = file.type.startsWith("video/");
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
        postURL = await getDownloadURL(snapshot.ref);
      }

      // Detect mentions (@username) using simple regex
      const mentions = [];
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: !isVideo ? postURL : null,
        postVideo: isVideo ? postURL : null,
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || "Anonymous",
        photoURL: auth.currentUser.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        shares: 0,
        mentions: mentions,
        createdAt: serverTimestamp()
      });

      postInput.value = "";
      postMediaInput.value = "";
      imagePreview.style.display = "none";

      // OPTIONAL: trigger browser notification
      if (Notification.permission === "granted") {
        new Notification("YourSpace", { body: "Post successfully uploaded!" });
      }

    } catch (err) {
      console.error("Post upload failed:", err);
      alert("Failed to upload post. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- Load Feed -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      const mediaHTML = data.postImage
        ? `<img src="${data.postImage}" class="postMedia">`
        : data.postVideo
        ? `<video controls src="${data.postVideo}" class="postMedia"></video>`
        : "";

      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 (${(data.comments || []).length})</button>
          <button class="shareBtn">Share (${data.shares || 0})</button>
          ${auth.currentUser.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      // Like
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislike
      postDiv.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Comment
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ text: commentText, user: auth.currentUser.uid })
        });
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        postDiv.querySelector(".commentsContainer").appendChild(commentEl);
      };

      // Share
      postDiv.querySelector(".shareBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { shares: increment(1) });
        alert("Post shared!");
      };

      // Delete
      const delBtn = postDiv.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }
    });
  });
});
