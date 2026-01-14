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

const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

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

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const profile = userSnap.exists() ? userSnap.data() : { displayName: "Anonymous" };

  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];
    if (!text && !file) {
      alert("Write something or attach a file.");
      return;
    }

    postBtn.disabled = true;

    let postImageURL = null;
    let postVideoURL = null;

    try {
      if (file) {
        // Determine content type
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const storagePath = file.type.startsWith("image/") || contentType.startsWith("image/") 
          ? `posts/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`
          : `posts/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`;

        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImageURL = url;
        if (contentType.startsWith("video/")) postVideoURL = url;
      }

      // Firestore post creation
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: postImageURL,
        postVideo: postVideoURL,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp(),
        notifyEmail: notifyEmail.checked || false,
        notifyBrowser: notifyBrowser.checked || false
      });

      postText.value = "";
      postFileInput.value = "";
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

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postElement = document.createElement("div");
      postElement.className = "post";

      postElement.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postMedia">` : ""}
        ${data.postVideo ? `<video controls src="${data.postVideo}" class="postMedia"></video>` : ""}
        <div class="postActions">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 (${data.comments ? data.comments.length : 0})</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postElement);

      const postRef = doc(db, "posts", docSnap.id);

      // Like
      postElement.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(postRef, { likes: increment(1) });
      };

      // Dislike
      postElement.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(postRef, { dislikes: increment(1) });
      };

      // Comment
      postElement.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;

        await updateDoc(postRef, {
          comments: arrayUnion({
            userId: user.uid,
            username: profile.displayName || "Anonymous",
            text: commentText,
            createdAt: serverTimestamp()
          })
        });
      };

      // Delete
      const delBtn = postElement.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete post?")) await deleteDoc(postRef);
        };
      }

      // Display comments
      const commentsContainer = postElement.querySelector(".commentsContainer");
      if (data.comments) {
        data.comments.forEach(c => {
          const cEl = document.createElement("p");
          cEl.textContent = `${c.username}: ${c.text}`;
          commentsContainer.appendChild(cEl);
        });
      }
    });
  });
});
