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

/* -------------------- Image/Video Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
  imagePreview.style.maxWidth = "300px";
  imagePreview.style.maxHeight = "300px";
});

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Create Post -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Write something or attach an image/video.");

    postBtn.disabled = true;
    let mediaURL = "";

    try {
      if (file) {
        const ext = file.name.split(".").pop().toLowerCase();
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { 
          contentType: file.type || (ext === "jpeg" || ext === "jpg" ? "image/jpeg" : "video/mp4") 
        });
        mediaURL = await getDownloadURL(snapshot.ref);
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: mediaURL || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: [],
        createdAt: serverTimestamp(),
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked
      });

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

  /* -------------------- Feed -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const postDiv = document.createElement("div");
      postDiv.className = "post";

      const mediaHTML = data.postImage ? `<img src="${data.postImage}" style="max-width:300px; max-height:300px;">` : "";

      postDiv.innerHTML = `
        <div>
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div>
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? '<button class="deleteBtn">Delete</button>' : ''}
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

      // Delete
      const del = postDiv.querySelector(".deleteBtn");
      if (del) {
        del.onclick = async () => {
          if (confirm("Delete post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // Comment (prompt example)
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const text = prompt("Enter comment:");
        if (!text) return;
        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ user: user.uid, text })
        });
        const commentEl = document.createElement("p");
        commentEl.textContent = text;
        postDiv.querySelector(".commentsContainer").appendChild(commentEl);
      };
    });
  });
});
