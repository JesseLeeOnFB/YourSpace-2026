import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

// Preview image/video
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

// Auth state
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Write something or attach a file.");

    postBtn.disabled = true;

    let postMediaURL = "";
    let mediaType = "";

    try {
      if (file) {
        mediaType = file.type;
        if (!mediaType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif"].includes(ext)) mediaType = "image/jpeg";
          if (["mp4", "mov", "webm"].includes(ext)) mediaType = "video/mp4";
        }

        const safeName = encodeURIComponent(file.name);

        // --- TARGET THE CORRECT BUCKET PATH ---
        const storageRef = ref(storage, `yourspace-2026.appspot.com/posts/${user.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { contentType: mediaType });
        postMediaURL = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: mediaType.startsWith("image") ? postMediaURL : null,
        postVideo: mediaType.startsWith("video") ? postMediaURL : null,
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

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

  // Load feed
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const post = document.createElement("div");
      post.className = "post";

      post.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postMedia">` : ""}
        ${data.postVideo ? `<video src="${data.postVideo}" controls class="postMedia"></video>` : ""}
        <div>
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };
      const delBtn = post.querySelector(".deleteBtn");
      if (delBtn) delBtn.onclick = async () => {
        if (confirm("Delete post?")) await doc(db, "posts", docSnap.id).delete();
      };
    });
  });
});
