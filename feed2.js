// feed2.js
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

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- DOM Elements ---
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// --- Auth listener ---
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  // NAV
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
  homeBtn.onclick = () => window.location.href = "feed.html";

  // --- POST CREATION ---
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    if (!text && postImageInput.files.length === 0) {
      return alert("Write something or attach an image!");
    }

    let postImageURL = "";

    // IMAGE UPLOAD
    if (postImageInput.files.length > 0) {
      try {
        const file = postImageInput.files[0];
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeName}`);

        console.log("Uploading file:", file.name);
        const uploadSnap = await uploadBytes(storageRef, file);
        postImageURL = await getDownloadURL(uploadSnap.ref);
        console.log("Image uploaded, URL:", postImageURL);

      } catch (err) {
        console.error("Image upload failed:", err);
        alert("Image upload failed. Only text will post.");
      }
    }

    // GET PROFILE DATA
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    const profileData = profileSnap.exists() ? profileSnap.data() : {};

    // CREATE POST
    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName: profileData.displayName || "Anonymous",
      photoURL: profileData.photoURL || "",
      postImage: postImageURL,
      likes: 0,
      comments: [],
      createdAt: serverTimestamp()
    });

    postInput.value = "";
    postImageInput.value = "";
  };

  // --- LISTEN TO POSTS ---
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";
      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${imageHTML}
        <div class="postButtons">
          <button type="button" class="likeBtn">Like (${data.likes || 0})</button>
          <button type="button" class="commentBtn">Comment</button>
          <button type="button" class="shareBtn">Share</button>
          ${user.uid === data.userId ? '<button type="button" class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      const commentsContainer = postDiv.querySelector(".commentsContainer");

      // Render comments
      (data.comments || []).forEach(c => {
        const commentEl = document.createElement("p");
        commentEl.textContent = c.text;
        commentsContainer.appendChild(commentEl);
      });

      // LIKE
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // COMMENT
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        await updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, user: user.uid }) });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      };

      // DELETE
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // SHARE
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
