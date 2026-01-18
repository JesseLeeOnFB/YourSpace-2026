import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const profilePic = document.getElementById("profilePic");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const uploadProgress = document.getElementById("uploadProgress");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const wallContainer = document.getElementById("wallContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");

let currentUser;

onAuthStateChanged(auth, (user) => {
  if (!user) return location.href = "login.html";
  currentUser = user;

  const userRef = doc(db, "users", user.uid);

  onSnapshot(userRef, snap => {
    if (!snap.exists()) return;
    const data = snap.data();

    profilePic.src = data.photoURL || "default-avatar.png";
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    wallContainer.innerHTML = "";
    (data.comments || []).forEach(c => {
      const div = document.createElement("div");
      div.className = "wall-comment";
      div.textContent = `${c.username}: ${c.text}`;
      wallContainer.appendChild(div);
    });
  });
});

// Save profile
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile saved");
};

// Wall post
postWallBtn.onclick = async () => {
  if (!wallInput.value.trim()) return;
  await updateDoc(doc(db, "users", currentUser.uid), {
    comments: arrayUnion({
      text: wallInput.value,
      username: currentUser.email.split("@")[0],
      createdAt: serverTimestamp()
    })
  });
  wallInput.value = "";
};

// Profile picture upload (THIS NOW WORKS)
savePfpBtn.onclick = () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select a file");

  uploadProgress.style.display = "block";

  const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);
  const task = uploadBytesResumable(storageRef, file);

  task.on("state_changed", snap => {
    uploadProgress.value = (snap.bytesTransferred / snap.totalBytes) * 100;
  });

  task.then(async () => {
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
    uploadProgress.style.display = "none";
  });
};
