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

/* -------------------- DOM -------------------- */
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const notifyEmailCheckbox = document.getElementById("notifyEmail");
const notifyBrowserCheckbox = document.getElementById("notifyBrowser");

/* -------------------- Auth & Navigation -------------------- */
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
  postFileInput.addEventListener("change", () => {
    const file = postFileInput.files[0];
    if (!file) {
      imagePreview.style.display = "none";
      return;
    }
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = "block";
    if (file.type.startsWith("video/")) {
      imagePreview.style.display = "none"; // We'll use a video element instead
    }
  });

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    postBtn.disabled = true;
    let postImageURL = null;
    let postVideoURL = null;
    const text = postText.value.trim();

    const file = postFileInput.files[0];

    try {
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImageURL = downloadURL;
        else if (contentType.startsWith("video/")) postVideoURL = downloadURL;
      }

      // Get user profile info
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Firestore post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: postImageURL,
        postVideo: postVideoURL,
        userId: auth.currentUser.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      // Reset UI
      postText.value = "";
      postFileInput.value = "";
      imagePreview.src = "";
      imagePreview.style.display = "none";
    } catch (err) {
      alert("Post creation failed. Check console.");
      console.error(err);
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- FEED -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postImage">`;
      if (data.postVideo) mediaHTML = `<video src="${data.postVideo}" controls class="postVideo"></video>`;

      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬 Comment</button>
          <button class="shareBtn">Share</button>
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
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { comments: arrayUnion({ text: commentText, user: auth.currentUser.uid }) });
      };

      // Delete
      const deleteBtn = postDiv.querySelector(".deleteBtn");
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
