// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ------------------- Firebase Init -------------------
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

// ------------------- DOM Elements -------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ------------------- Auth -------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const profile = userSnap.exists() ? userSnap.data() : {};

  // Nav buttons
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // ------------------- Image/Video Preview -------------------
  postFileInput.addEventListener("change", () => {
    const file = postFileInput.files[0];
    if (!file) {
      imagePreview.style.display = "none";
      imagePreview.src = "";
      return;
    }

    if (file.type.startsWith("image/")) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.style.display = "block";
      imagePreview.style.maxWidth = "300px";
      imagePreview.style.maxHeight = "300px";
    } else if (file.type.startsWith("video/")) {
      imagePreview.src = "";
      imagePreview.style.display = "none";
      // Optionally implement a video preview element
    }
  });

  // ------------------- Create Post -------------------
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Write something or attach media first.");

    postBtn.disabled = true;

    let postImage = "";
    let postVideo = "";

    try {
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImage = url;
        if (contentType.startsWith("video/")) postVideo = url;
      }

      await addDoc(collection(db, "posts"), {
        text,
        postImage: postImage || null,
        postVideo: postVideo || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

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

  // ------------------- Load Feed -------------------
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postImage" style="max-width:300px; max-height:300px;">`;
      if (data.postVideo) mediaHTML = `<video controls src="${data.postVideo}" class="postVideo" style="max-width:300px; max-height:300px;"></video>`;

      // Replace mentions like @username with styled span
      let textHTML = data.text || "";
      textHTML = textHTML.replace(/@(\w+)/g, `<span class="mention">@$1</span>`);

      postDiv.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${textHTML}</p>
        ${mediaHTML}
        <div>
          <button class="likeBtn">👍 (${data.likes||0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes||0})</button>
          <button class="commentBtn">💬 (${(data.comments||[]).length})</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
      `;
      postsContainer.appendChild(postDiv);

      // Like/Dislike
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };
      postDiv.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Delete
      const delBtn = postDiv.querySelector(".deleteBtn");
      if (delBtn) delBtn.onclick = async () => {
        if (confirm("Delete post?")) await updateDoc(doc(db, "posts", docSnap.id), { deleted: true });
      };

      // Comments (basic)
      const commentBtn = postDiv.querySelector(".commentBtn");
      commentBtn.onclick = () => {
        const comment = prompt("Enter your comment:");
        if (comment) updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion(comment) });
      };
    });
  });
});
