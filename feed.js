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
const notifyEmailCheckbox = document.getElementById("notifyEmail");
const notifyBrowserCheckbox = document.getElementById("notifyBrowser");

/* -------------------- Preview -------------------- */
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
  } else {
    imagePreview.style.display = "none";
    imagePreview.src = "";
  }
});

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav buttons
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
    const notifyEmail = notifyEmailCheckbox.checked;
    const notifyBrowser = notifyBrowserCheckbox.checked;

    if (!text && !file) {
      alert("Write something or attach an image/video.");
      return;
    }

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";

    let postImageURL = "";
    let postVideoURL = "";

    try {
      if (file) {
        // Determine contentType
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        // Set folder based on type
        const folder = contentType.startsWith("image/") ? "posts" : "posts";

        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImageURL = url;
        else if (contentType.startsWith("video/")) postVideoURL = url;
      }

      // Get user profile
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
        notifications: { email: notifyEmail, browser: notifyBrowser },
        createdAt: serverTimestamp()
      });

      // Reset UI
      postInput.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
      imagePreview.src = "";

    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = "Post";
    }
  };

  /* -------------------- FEED -------------------- */
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      // Post content
      let mediaHTML = "";
      if (data.postImage) mediaHTML += `<img src="${data.postImage}" class="postMedia">`;
      if (data.postVideo) mediaHTML += `<video src="${data.postVideo}" controls class="postMedia"></video>`;

      postDiv.innerHTML = `
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
          <button class="shareBtn">🔁</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postDiv);

      // Likes
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislikes
      postDiv.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Comment
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        await updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, user: user.uid }) });
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
