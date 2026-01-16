import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");

// Redirect if not logged in
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();

    // Load profile info
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Load wall comments safely
    commentContainer.innerHTML = "";
    const comments = data.wallComments || [];
    comments.forEach(c => {
      const div = document.createElement("div");
      div.textContent = `${c.user || "Unknown"}: ${c.text || ""}`;
      commentContainer.appendChild(div);
    });
  }
});

// Save profile info (username, bio, location)
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile updated!");
  } catch (err) {
    console.error("Error saving profile info:", err);
    alert("Failed to save profile info.");
  }
});

// Save profile picture
saveProfilePicBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select a profile picture.");

  try {
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { pfpURL: url });

    profilePfp.src = url;
    alert("Profile picture updated!");
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    alert("Failed to save profile picture.");
  }
});

// Post a wall comment
postWallCommentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const text = wallCommentInput.value.trim();
  if (!text) return;

  const userDocRef = doc(db, "users", user.uid);

  const newComment = {
    user: usernameInput.value || user.email.split("@")[0],
    text
  };

  try {
    await updateDoc(userDocRef, {
      wallComments: arrayUnion(newComment)
    });

    const div = document.createElement("div");
    div.textContent = `${newComment.user}: ${newComment.text}`;
    commentContainer.appendChild(div);
    wallCommentInput.value = "";
  } catch (err) {
    console.error("Error posting wall comment:", err);
    alert("Failed to post comment.");
  }
});
