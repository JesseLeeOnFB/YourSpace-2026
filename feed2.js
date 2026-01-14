// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, getDoc,
  updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// Show image preview
postImageInput.onchange = () => {
  if (postImageInput.files.length > 0) {
    const file = postImageInput.files[0];
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  } else {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation buttons
postBtn.onclick = async () => {
  console.log("POST CLICKED");

  const text = postInput.value.trim();
  let postImageURL = "";

  console.log("Text:", text);
  console.log("Files:", postImageInput.files);

  if (!text && postImageInput.files.length === 0) {
    alert("Write something or attach an image!");
    return;
  }

  if (postImageInput.files.length > 0) {
    const file = postImageInput.files[0];
    console.log("Selected file:", file);
    console.log("File type:", file.type);

    try {
      const metadata = {
        contentType: file.type || "image/jpeg"
      };

      const storageRef = ref(
        storage,
        `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`
      );

      console.log("Uploading to:", storageRef.fullPath);

      const uploadSnap = await uploadBytes(storageRef, file, metadata);
      console.log("Upload success");

      postImageURL = await getDownloadURL(uploadSnap.ref);
      console.log("Download URL:", postImageURL);

    } catch (err) {
      console.error("UPLOAD FAILED:", err);
      alert("UPLOAD FAILED — check console");
      return; // stop execution if upload fails
    }
  }

  console.log("Creating Firestore post");

  const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const profileData = profileSnap.exists() ? profileSnap.data() : {};

  await addDoc(collection(db, "posts"), {
    text,
    userId: auth.currentUser.uid,
    displayName: profileData.displayName || "Anonymous",
    photoURL: profileData.photoURL || "",
    postImage: postImageURL,
    likes: 0,
    comments: [],
    createdAt: serverTimestamp()
  });

  console.log("POST CREATED");

  postInput.value = "";
  postImageInput.value = "";
  imagePreview.style.display = "none";
};

  // LISTEN TO POSTS
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
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

      (data.comments || []).forEach(c => {
        const commentEl = document.createElement("p");
        commentEl.textContent = c.text;
        commentsContainer.appendChild(commentEl);
      });

      // LIKE
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: increment(1) });
      };

      // COMMENT
      const commentBtn = postDiv.querySelector(".commentBtn");
      commentBtn.onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { comments: arrayUnion({ text: commentText, user: user.uid }) });
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
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      };
    });
  });
});
