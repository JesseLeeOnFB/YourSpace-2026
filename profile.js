import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ---------------- Firebase config ----------------
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

// ---------------- DOM Elements ----------------
const profileImg = document.getElementById("profilePic");
const photoInput = document.getElementById("photoInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicURL");
const saveProfileBtn = document.getElementById("saveProfile");
const customCodeInput = document.getElementById("customCode");
const saveCustomBtn = document.getElementById("saveCustom");
const customProfileDiv = document.getElementById("customProfileDiv");
const userPostsContainer = document.getElementById("userPostsContainer");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------- Auth check ----------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in");
    window.location.href = "index.html";
    return;
  }

  // ---------------- Load profile ----------------
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicURL || "";
    if (data.photoURL) profileImg.src = data.photoURL;
    if (data.customCode) customProfileDiv.innerHTML = data.customCode;
  }

  // ---------------- Save profile ----------------
  saveProfileBtn.addEventListener("click", async () => {
    try {
      const updates = {
        displayName: displayNameInput.value,
        bio: bioInput.value,
        location: locationInput.value,
        musicURL: musicInput.value
      };

      if (photoInput.files.length > 0) {
        const file = photoInput.files[0];
        const storageRef = ref(storage, `profileImages/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        updates.photoURL = await getDownloadURL(storageRef);
        profileImg.src = updates.photoURL;
      }

      await setDoc(doc(db, "users", user.uid), updates, { merge: true });
      alert("Profile updated!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile");
    }
  });

  // ---------------- Save custom HTML/CSS ----------------
  saveCustomBtn.addEventListener("click", async () => {
    try {
      const customHTML = customCodeInput.value;
      customProfileDiv.innerHTML = customHTML;
      await setDoc(doc(db, "users", user.uid), { customCode: customHTML }, { merge: true });
      alert("Custom profile updated!");
    } catch (err) {
      console.error("Error updating custom code:", err);
    }
  });

  // ---------------- Navigation ----------------
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  // ---------------- Load user posts ----------------
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(async (docSnap) => {
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
          <button class="deleteBtn">Delete</button>
        </div>
        <div class="commentsContainer"></div>
      `;
      userPostsContainer.appendChild(postDiv);

      // ---------------- Post Buttons ----------------

      // Like
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        try {
          const postRef = doc(db, "posts", docSnap.id);
          const postSnap = await getDoc(postRef);
          const currentLikes = postSnap.data().likes || 0;
          await updateDoc(postRef, { likes: currentLikes + 1 });
          likeBtn.textContent = `Like (${currentLikes + 1})`;
        } catch (err) {
          console.error("Error liking post:", err);
        }
      });

      // Comment
      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        try {
          const postRef = doc(db, "posts", docSnap.id);
          const postSnap = await getDoc(postRef);
          const updatedComments = [...(postSnap.data().comments || []), { text: commentText, userId: user.uid }];
          await updateDoc(postRef, { comments: updatedComments });

          const commentEl = document.createElement("p");
          commentEl.textContent = commentText;
          commentsContainer.appendChild(commentEl);
        } catch (err) {
          console.error("Error commenting:", err);
        }
      });

      // Delete
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          try {
            await deleteDoc(doc(db, "posts", docSnap.id));
          } catch (err) {
            console.error("Error deleting post:", err);
          }
        }
      });

      // Share
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      });

      // Render comments initially
      if (data.comments && data.comments.length > 0) {
        data.comments.forEach(c => {
          const commentEl = document.createElement("p");
          commentEl.textContent = c.text;
          commentsContainer.appendChild(commentEl);
        });
      }
    });
  });
});
