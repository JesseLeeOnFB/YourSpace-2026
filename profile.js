import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// DOM elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const topFriendsContainer = document.querySelector(".top-friends-container");

// AUTH STATE LOAD
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Load top friends
    topFriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const div = document.createElement("div");
      div.textContent = friend;
      topFriendsContainer.appendChild(div);
    });

    // Load wall comments
    commentContainer.innerHTML = "";
    (data.wallComments || []).forEach((c, idx) => {
      const div = document.createElement("div");
      div.classList.add("wall-comment");
      div.innerHTML = `<strong>${c.user}:</strong> ${c.text} 
                       <button class="deleteCommentBtn" data-index="${idx}">Delete</button>`;
      commentContainer.appendChild(div);
    });

    // Add delete comment listeners
    document.querySelectorAll(".deleteCommentBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const index = btn.getAttribute("data-index");
        const updatedComments = (userSnap.data().wallComments || []).filter((_, i) => i != index);
        await updateDoc(userDocRef, { wallComments: updatedComments });
        div.remove();
      });
    });

  } catch (err) {
    console.error("Failed to load profile data", err);
  }
});

// SAVE PROFILE INFO
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
    alert("Profile info updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to update profile info");
  }
});

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select a picture first");
  try {
    const user = auth.currentUser;
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Update img preview and Firestore
    profilePfp.src = url;
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile picture");
  }
});

// POST WALL COMMENT
postWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const currentComments = userSnap.data().wallComments || [];
  const newComments = [...currentComments, { user: user.displayName || user.email.split("@")[0], text }];
  await updateDoc(userDocRef, { wallComments: newComments });

  const div = document.createElement("div");
  div.classList.add("wall-comment");
  div.innerHTML = `<strong>${user.displayName || user.email.split("@")[0]}:</strong> ${text} 
                   <button class="deleteCommentBtn">Delete</button>`;
  commentContainer.appendChild(div);

  // Add delete listener for new comment
  div.querySelector(".deleteCommentBtn").addEventListener("click", async () => {
    const updatedComments = newComments.filter(c => c.text !== text);
    await updateDoc(userDocRef, { wallComments: updatedComments });
    div.remove();
  });

  wallCommentInput.value = "";
});
