// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
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
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

/* -------------------- Auth & Navigation -------------------- */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav
  homeBtn.onclick = () => (window.location.href = "feed.html");
  profileBtn.onclick = () => (window.location.href = "profile.html");
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
    if (file.type.startsWith("image/")) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.style.display = "block";
    } else {
      imagePreview.style.display = "none";
    }
  });

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    postBtn.disabled = true;

    const text = postText.value.trim();
    const file = postFileInput.files[0];
    if (!text && !file) {
      alert("Write something or attach a file.");
      postBtn.disabled = false;
      return;
    }

    let postImageURL = null;
    let postVideoURL = null;

    try {
      // Upload file if exists
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const storagePath = file.type.startsWith("image/") 
          ? `posts/${user.uid}/${Date.now()}_${file.name}`
          : `posts/${user.uid}/videos/${Date.now()}_${file.name}`;

        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (file.type.startsWith("image/")) postImageURL = downloadURL;
        else postVideoURL = downloadURL;
      }

      // Get user profile info
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create post in Firestore
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        text,
        postImage: postImageURL || null,
        postVideo: postVideoURL || null,
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: extractMentions(text),
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked,
        createdAt: serverTimestamp()
      });

      // Reset
      postText.value = "";
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
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const post = document.createElement("div");
      post.className = "post";

      let mediaHTML = "";
      if (data.postImage) mediaHTML += `<img src="${data.postImage}" class="postMedia">`;
      if (data.postVideo) mediaHTML += `<video src="${data.postVideo}" class="postMedia" controls></video>`;

      post.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div>
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬 ${data.comments ? data.comments.length : 0}</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
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
      const del = post.querySelector(".deleteBtn");
      if (del) {
        del.onclick = async () => {
          if (confirm("Delete this post?")) await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }
    });
  });

  /* -------------------- Helper -------------------- */
  function extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }
});
