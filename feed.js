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
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

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

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav Buttons
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

    let postImageURL = "";
    let postVideoURL = "";

    try {
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const safeName = encodeURIComponent(file.name);
        let storagePath = `posts/${user.uid}/${Date.now()}_${safeName}`;

        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImageURL = url;
        if (contentType.startsWith("video/")) postVideoURL = url;
      }

      // Get profile info
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create Firestore post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: postImageURL || null,
        postVideo: postVideoURL || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: [],
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked,
        createdAt: serverTimestamp()
      });

      // Reset UI
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
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const post = document.createElement("div");
      post.className = "post";

      post.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postImage">` : ""}
        ${data.postVideo ? `<video src="${data.postVideo}" class="postVideo" controls></video>` : ""}
        <div class="postActions">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 Comment</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
      `;

      postsContainer.appendChild(post);

      // Like
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      // Dislike
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: increment(1)
        });
      };

      // Delete
      const del = post.querySelector(".deleteBtn");
      if (del) {
        del.onclick = async () => {
          if (confirm("Delete post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // Comments / Mentions / Share can be added here later
    });
  });
});
