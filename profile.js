import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

document.addEventListener("DOMContentLoaded", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login required!");

  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const photoInput = document.getElementById("photoInput");
  const profilePhoto = document.getElementById("profilePhoto");
  const displayNameInput = document.getElementById("displayName");
  const bioInput = document.getElementById("bio");
  const locationInput = document.getElementById("location");
  const musicInput = document.getElementById("musicURL");
  const saveBtn = document.getElementById("saveProfileBtn");
  const userPostsContainer = document.getElementById("userPostsContainer");

  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  // Load profile
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicURL || "";
    profilePhoto.src = data.photoURL || "default.png";
  }

  // Upload new profile photo
  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const photoRef = ref(storage, `profilePhotos/${user.uid}/${file.name}`);
    await uploadBytes(photoRef, file);
    const url = await getDownloadURL(photoRef);
    profilePhoto.src = url;
    await setDoc(userDocRef, { photoURL: url }, { merge: true });
  });

  // Save profile
  saveBtn.addEventListener("click", async () => {
    await setDoc(userDocRef, {
      displayName: displayNameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim(),
      musicURL: musicInput.value.trim()
    }, { merge: true });
    alert("Profile updated!");
  });

  // Load user posts
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.userId !== user.uid) return; // only this user's posts

      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="post-header">
          <img class="post-photo" src="${data.photoURL || 'default.png'}" alt="Profile">
          <strong>${data.displayName || 'Anonymous'}</strong>
        </div>
        <p class="post-text">${data.text}</p>
        <div class="post-buttons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment (${data.comments?.length || 0})</button>
          <button class="shareBtn">Share</button>
          <button class="deleteBtn">Delete</button>
        </div>
      `;
      userPostsContainer.appendChild(postDiv);

      // Like
      postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
        await setDoc(doc(db, "posts", docSnap.id), { likes: (data.likes || 0) + 1 }, { merge: true });
      });

      // Delete
      postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", docSnap.id));
      });

      // Comment
      postDiv.querySelector(".commentBtn").addEventListener("click", async () => {
        const comment = prompt("Write your comment:");
        if (!comment) return;
        const comments = data.comments || [];
        comments.push({ userId: user.uid, text: comment });
        await setDoc(doc(db, "posts", docSnap.id), { comments }, { merge: true });
      });

      // Share
      postDiv.querySelector(".shareBtn").addEventListener("click", () => {
        const url = `${window.location.href}?post=${docSnap.id}`;
        navigator.clipboard.writeText(url);
        alert("Post link copied!");
      });
    });
  });

});
