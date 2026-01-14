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
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  getDoc
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
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
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

  // ---- CREATE POST ----
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

    // Fetch profile info
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

  // ---- NAV BUTTONS ----
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // ---- LISTEN TO POSTS ----
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      // Post header
      const headerDiv = document.createElement("div");
      headerDiv.classList.add("postHeader");
      const profileImg = document.createElement("img");
      profileImg.src = data.photoURL || "default-avatar.png";
      profileImg.classList.add("postProfilePic");
      const displayNameEl = document.createElement("strong");
      displayNameEl.textContent = data.displayName || "Anonymous";
      headerDiv.appendChild(profileImg);
      headerDiv.appendChild(displayNameEl);

      // Post text
      const textP = document.createElement("p");
      textP.textContent = data.text || "";

      // Post image
      let imgEl = null;
      if (data.postImage) {
        imgEl = document.createElement("img");
        imgEl.src = data.postImage;
        imgEl.classList.add("postImage");
      }

      // Post buttons
      const buttonsDiv = document.createElement("div");
      buttonsDiv.classList.add("postButtons");

      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.classList.add("likeBtn");
      likeBtn.textContent = `Like (${data.likes || 0})`;

      const commentBtn = document.createElement("button");
      commentBtn.type = "button";
      commentBtn.classList.add("commentBtn");
      commentBtn.textContent = "Comment";

      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.classList.add("shareBtn");
      shareBtn.textContent = "Share";

      buttonsDiv.appendChild(likeBtn);
      buttonsDiv.appendChild(commentBtn);
      buttonsDiv.appendChild(shareBtn);

      // Delete button only if user owns post
      let deleteBtn = null;
      if (user.uid === data.userId) {
        deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.classList.add("deleteBtn");
        deleteBtn.textContent = "Delete";
        buttonsDiv.appendChild(deleteBtn);
      }

      // Comments container
      const commentsContainer = document.createElement("div");
      commentsContainer.classList.add("commentsContainer");
      (data.comments || []).forEach((c) => {
        const commentEl = document.createElement("p");
        commentEl.textContent = c.text;
        commentsContainer.appendChild(commentEl);
      });

      // Append everything
      postDiv.appendChild(headerDiv);
      postDiv.appendChild(textP);
      if (imgEl) postDiv.appendChild(imgEl);
      postDiv.appendChild(buttonsDiv);
      postDiv.appendChild(commentsContainer);
      postsContainer.appendChild(postDiv);

      // ---- BUTTON FUNCTIONALITY ----

      // Like
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: increment(1) });
      });

      // Comment
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;

        const postRef = doc(db, "posts", docSnap.id);
        const latestSnap = await getDoc(postRef);
        const latestData = latestSnap.exists() ? latestSnap.data() : {};
        const updatedComments = [...(latestData.comments || []), { text: commentText, user: user.uid }];
        await updateDoc(postRef, { comments: updatedComments });

        // Render immediately
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      });

      // Delete
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        });
      }

      // Share
      shareBtn.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      });

    });
  });
});
