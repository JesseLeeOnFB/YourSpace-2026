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
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
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

/* -------------------- DOM -------------------- */
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const postBtn = document.getElementById("postBtn");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Image/Video Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    imagePreview.style.maxWidth = "300px";
    imagePreview.style.maxHeight = "300px";
  } else {
    imagePreview.style.display = "none";
  }
});

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  homeBtn.onclick = () => (window.location.href = "feed.html");
  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

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

    let postImageURL = "";
    let postVideoURL = "";

    try {
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const safeName = encodeURIComponent(file.name);
        const folder = contentType.startsWith("image/") ? "posts" : "posts";
        const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);
        if (contentType.startsWith("image/")) postImageURL = url;
        else if (contentType.startsWith("video/")) postVideoURL = url;
      }

      // Get user profile for display name and photo
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        text: text || null,
        postImage: postImageURL || null,
        postVideo: postVideoURL || null,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp(),
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked
      });

      // Reset UI
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

  /* -------------------- LOAD FEED -------------------- */
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
        ${data.postImage ? `<img src="${data.postImage}" class="postImage" style="max-width:300px; max-height:300px;">` : ""}
        ${data.postVideo ? `<video src="${data.postVideo}" controls style="max-width:300px;"></video>` : ""}
        <div class="postActions">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 Comment</button>
          <button class="shareBtn">🔗 Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
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
      // Comment
      post.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const commentObj = {
          text: commentText,
          userId: user.uid,
          displayName: (await getDoc(doc(db, "users", user.uid))).data()?.displayName || "Anonymous",
          createdAt: new Date()
        };
        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion(commentObj)
        });
      };
      // Delete
      const delBtn = post.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // Display comments
      const commentsContainer = post.querySelector(".commentsContainer");
      if (data.comments?.length) {
        data.comments.forEach(c => {
          const commentEl = document.createElement("div");
          commentEl.textContent = `${c.displayName || "Anonymous"}: ${c.text}`;
          commentsContainer.appendChild(commentEl);
        });
      }
    });
  });
});
