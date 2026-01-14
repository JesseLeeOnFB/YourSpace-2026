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
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postVideoInput = document.getElementById("postVideoInput");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Preview Media -------------------- */
postImageInput.addEventListener("change", () => {
  const file = postImageInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

postVideoInput.addEventListener("change", () => {
  const file = postVideoInput.files[0];
  if (!file) {
    videoPreview.style.display = "none";
    return;
  }
  videoPreview.src = URL.createObjectURL(file);
  videoPreview.style.display = "block";
});

/* -------------------- Auth & Navigation -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Create Post -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const imageFile = postImageInput.files[0];
    const videoFile = postVideoInput.files[0];

    if (!text && !imageFile && !videoFile) {
      alert("Write something or attach media.");
      return;
    }

    postBtn.disabled = true;

    let postImageURL = "";
    let postVideoURL = "";

    try {
      // --- Upload Image ---
      if (imageFile) {
        const safeName = encodeURIComponent(imageFile.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || "image/jpeg" });
        postImageURL = await getDownloadURL(snapshot.ref);
      }

      // --- Upload Video ---
      if (videoFile) {
        const safeName = encodeURIComponent(videoFile.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, videoFile, { contentType: videoFile.type || "video/mp4" });
        postVideoURL = await getDownloadURL(snapshot.ref);
      }

      // --- Fetch Profile ---
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profile = profileSnap.exists() ? profileSnap.data() : {};

      // --- Create Firestore Post ---
      await addDoc(collection(db, "posts"), {
        text,
        postImage: postImageURL || null,
        postVideo: postVideoURL || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: [], // for future tagging
        createdAt: serverTimestamp(),
        notifications: {
          email: notifyEmail.checked || false,
          browser: notifyBrowser.checked || false
        }
      });

      // --- Reset UI ---
      postInput.value = "";
      postImageInput.value = "";
      postVideoInput.value = "";
      imagePreview.style.display = "none";
      videoPreview.style.display = "none";

    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Failed to create post. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- Listen to Posts -------------------- */
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      // --- Media ---
      const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";
      const videoHTML = data.postVideo ? `<video src="${data.postVideo}" controls class="postVideo"></video>` : "";

      // --- Buttons ---
      const likeBtn = `<button class="likeBtn">👍 (${data.likes || 0})</button>`;
      const dislikeBtn = `<button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>`;
      const commentBtn = `<button class="commentBtn">💬</button>`;
      const shareBtn = `<button class="shareBtn">Share</button>`;
      const deleteBtn = user.uid === data.userId ? `<button class="deleteBtn">Delete</button>` : "";

      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${imageHTML} ${videoHTML}
        <div class="postButtons">${likeBtn}${dislikeBtn}${commentBtn}${shareBtn}${deleteBtn}</div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      // --- LIKE ---
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // --- DISLIKE ---
      const dislikeEl = postDiv.querySelector(".dislikeBtn");
      if (dislikeEl) {
        dislikeEl.onclick = async () => {
          await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
        };
      }

      // --- COMMENT ---
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter comment:");
        if (!commentText) return;
        await updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, user: user.uid }) });
      };

      // --- DELETE ---
      const delEl = postDiv.querySelector(".deleteBtn");
      if (delEl) {
        delEl.onclick = async () => {
          if (confirm("Delete post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // --- SHARE ---
      postDiv.querySelector(".shareBtn").onclick = () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      };
    });
  });
});
