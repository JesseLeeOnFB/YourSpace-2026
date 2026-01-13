// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const profilePhoto = document.getElementById("profilePhoto");
  const displayNameEl = document.getElementById("displayName");
  const bioEl = document.getElementById("bio");
  const locationEl = document.getElementById("location");
  const musicEl = document.getElementById("music");
  const photoUpload = document.getElementById("photoUpload");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const postsContainer = document.getElementById("postsContainer");

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in!");
    window.location.href = "index.html";
    return;
  }

  // NAV BUTTONS
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  // Load user profile
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const profile = userSnap.exists() ? userSnap.data() : {};
  profilePhoto.src = profile.photoURL || "default.png";
  displayNameEl.textContent = profile.displayName || user.email;
  bioEl.textContent = profile.bio || "";
  locationEl.textContent = "Location: " + (profile.location || "");
  musicEl.innerHTML = "Music: " + (profile.music || "");

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    let photoURL = profile.photoURL || "";
    if (photoUpload.files.length > 0) {
      const file = photoUpload.files[0];
      const storageRef = ref(storage, `profilePhotos/${user.uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
      profilePhoto.src = photoURL;
    }

    await updateDoc(userDocRef, {
      displayName: displayNameEl.textContent,
      bio: bioEl.textContent,
      location: locationEl.textContent.replace("Location: ", ""),
      music: musicEl.textContent.replace("Music: ", ""),
      photoURL
    });

    alert("Profile updated!");
  });

  // Load user's posts
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="postHeader">
          <img class="postProfilePic" src="${data.photoURL || 'default.png'}" alt="Profile Pic">
          <strong>${data.displayName || "Anonymous"}</strong>
        </div>
        <p>${data.text}</p>
        <div class="postButtons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          <button class="deleteBtn">Delete</button>
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(postDiv);

      // BUTTONS
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      });

      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        const updatedComments = [...(data.comments || []), { text: commentText, user: user.uid }];
        await updateDoc(postRef, { comments: updatedComments });
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      });

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });

      const shareBtn = postDiv.querySelector(".shareBtn");
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
