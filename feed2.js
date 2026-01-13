// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, query, orderBy, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// -------------------- CONFIG --------------------
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

// -------------------- DOM ELEMENTS --------------------
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");
const trendingContainer = document.getElementById("trendingPost");

// -------------------- AUTH --------------------
let currentUser;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in");
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  // -------------------- POST BUTTON --------------------
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    if (!text && postImageInput.files.length === 0) return alert("Write something or attach an image!");

    let postImageURL = "";
    if (postImageInput.files.length > 0) {
      const file = postImageInput.files[0];
      const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      postImageURL = await getDownloadURL(storageRef);
    }

    // Fetch current user's profile
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};

    await addDoc(collection(db, "posts"), {
      text,
      userId: currentUser.uid,
      displayName: profile.displayName || "Anonymous",
      photoURL: profile.photoURL || "",
      postImage: postImageURL,
      likes: 0,
      comments: [],
      createdAt: serverTimestamp()
    });

    postInput.value = "";
    postImageInput.value = "";
  };

  // -------------------- NAV --------------------
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
  homeBtn.onclick = () => window.location.href = "feed.html";

  // -------------------- LOAD POSTS --------------------
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      // Render post
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
          ${currentUser.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      // -------------------- BUTTONS --------------------
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      };

      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        const updatedComments = [...(data.comments || []), { text: commentText, user: currentUser.uid }];
        await updateDoc(postRef, { comments: updatedComments });
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      };

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) deleteBtn.onclick = async () => {
        if (confirm("Delete this post?")) await deleteDoc(doc(db, "posts", docSnap.id));
      };

      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.onclick = () => {
        if (navigator.share) navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        else prompt("Copy this link:", window.location.href);
      };
    });
  });
});
