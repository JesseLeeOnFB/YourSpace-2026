import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
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

// AUTH STATE
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Load wall comments
    commentContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
      const div = document.createElement("div");
      div.textContent = `${c.user}: ${c.text}`;
      commentContainer.appendChild(div);
    });
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
    alert("Profile info saved!");
  } catch (err) {
    alert("Failed to save profile info: " + err.message);
  }
});

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select an image first.");

  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { pfpURL: url });

    profilePfp.src = url;
    alert("Profile picture updated!");
  } catch (err) {
    alert("Failed to save profile picture: " + err.message);
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

  try {
    await updateDoc(userDocRef, { wallComments: newComments });

    const div = document.createElement("div");
    div.textContent = `${user.displayName || user.email.split("@")[0]}: ${text}`;
    commentContainer.appendChild(div);
    wallCommentInput.value = "";
  } catch (err) {
    alert("Failed to post comment: " + err.message);
  }
});
