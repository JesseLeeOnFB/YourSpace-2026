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
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

/* -------------------- DOM Elements -------------------- */
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");
const notifyEmailCheckbox = document.getElementById("notifyEmail");
const notifyBrowserCheckbox = document.getElementById("notifyBrowser");

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

/* -------------------- Auth State -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* Nav Buttons */
  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Create Post -------------------- */
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach an image/video.");
      return;
    }

    postBtn.disabled = true;

    let postMediaURL = "";

    try {
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
        postMediaURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create post document
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: file && file.type.startsWith("image/") ? postMediaURL : null,
        postVideo: file && file.type.startsWith("video/") ? postMediaURL : null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: [], // for tagging
        notifications: {
          email: notifyEmailCheckbox.checked,
          browser: notifyBrowserCheckbox.checked
        },
        createdAt: serverTimestamp()
      });

      // Reset form
      postText.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- Feed Listener -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const postEl = document.createElement("div");
      postEl.className = "post";

      // Media HTML
      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postMedia">`;
      if (data.postVideo) mediaHTML = `<video src="${data.postVideo}" controls class="postMedia"></video>`;

      postEl.innerHTML = `
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
          <button class="shareBtn">🔗</button>
          ${data.userId === user.uid ? '<button class="deleteBtn">🗑️</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postEl);

      // Like
      postEl.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislike
      postEl.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Comment
      postEl.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { comments: arrayUnion({ text: commentText, user: user.uid }) });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        postEl.querySelector(".commentsContainer").appendChild(commentEl);
      };

      // Delete
      const deleteBtn = postEl.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }
    });
  });
});
