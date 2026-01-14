// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase config
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

// DOM elements
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // NAV buttons
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // POST CREATION
  postBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text && postImageInput.files.length === 0) {
      alert("Write something or attach an image!");
      return;
    }

    let postImageURL = "";
    if (postImageInput.files.length > 0) {
      const file = postImageInput.files[0];
      const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      postImageURL = await getDownloadURL(storageRef);
    }

    // Fetch user profile
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    const profileData = profileSnap.exists() ? profileSnap.data() : {};

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
  });

  // LISTEN TO POSTS
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
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      const commentsContainer = postDiv.querySelector(".commentsContainer");

      // Render existing comments
      (data.comments || []).forEach(c => {
        const commentEl = document.createElement("p");
        commentEl.textContent = c.text;
        commentsContainer.appendChild(commentEl);
      });

      // LIKE BUTTON
      likeBtn.addEventListener("click", async () => {
  const postRef = doc(db, "posts", docSnap.id);

  // Increment UI immediately
  const currentLikes = data.likes || 0;
  data.likes = currentLikes + 1; // update local variable
  likeBtn.textContent = `Like (${data.likes})`;

  // Update Firestore
  await updateDoc(postRef, { likes: increment(1) });
});

      // COMMENT BUTTON
      import { arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const commentBtn = postDiv.querySelector(".commentBtn");
commentBtn.addEventListener("click", async () => {
  const commentText = prompt("Enter your comment:");
  if (!commentText) return;

  const postRef = doc(db, "posts", docSnap.id);

  const commentObj = { text: commentText, user: user.uid };
  
  await updateDoc(postRef, { comments: arrayUnion(commentObj) });

  // Render immediately
  const commentEl = document.createElement("p");
  commentEl.textContent = commentText;
  commentsContainer.appendChild(commentEl);
});

      // DELETE BUTTON
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        });
      }

      // SHARE BUTTON
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      });
    });
  });
});
