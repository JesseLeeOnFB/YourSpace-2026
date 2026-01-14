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
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
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
const postFileInput = document.getElementById("postFileInput"); // image/video
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Image/Video Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (file.type.startsWith("image/")) {
    imagePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:200px; max-height:200px;">`;
  } else if (file.type.startsWith("video/")) {
    imagePreview.innerHTML = `<video src="${URL.createObjectURL(file)}" style="max-width:200px; max-height:200px;" controls></video>`;
  }
  imagePreview.style.display = "block";
});

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation buttons
  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach an image/video!");
      return;
    }

    postBtn.disabled = true;

    let mediaURL = "";
    try {
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);

        // Force lowercase MIME type with fallback
        let contentType = let contentType = file.type;
if (!contentType) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
  if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
}

        const snapshot = await uploadBytes(storageRef, file, { contentType });
        mediaURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile
      const userSnap = await doc(db, "users", auth.currentUser.uid).get();
      const profile = userSnap.exists ? userSnap.data() : {};

      // Add post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: mediaURL || null,
        userId: auth.currentUser.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: [],
        createdAt: serverTimestamp()
      });

      // Reset inputs
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

      const postEl = document.createElement("div");
      postEl.className = "post";

      let mediaHTML = "";
      if (data.postImage) {
        if (data.postImage.endsWith(".mp4") || data.postImage.endsWith(".mov") || data.postImage.endsWith(".webm")) {
          mediaHTML = `<video src="${data.postImage}" controls style="max-width:400px; max-height:300px;"></video>`;
        } else {
          mediaHTML = `<img src="${data.postImage}" style="max-width:400px; max-height:300px;">`;
        }
      }

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
          <button class="commentBtn">💬</button>
          <button class="shareBtn">🔗</button>
          ${auth.currentUser.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postEl);

      // Button actions
      postEl.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };
      postEl.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };
      postEl.querySelector(".deleteBtn")?.addEventListener("click", async () => {
        if (confirm("Delete this post?")) await deleteDoc(doc(db, "posts", docSnap.id));
      });
      postEl.querySelector(".commentBtn")?.addEventListener("click", async () => {
        const commentText = prompt("Enter comment:");
        if (!commentText) return;
        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ text: commentText, user: auth.currentUser.uid })
        });
      });
    });
  });
});
