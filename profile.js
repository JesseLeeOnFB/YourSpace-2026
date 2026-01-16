import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// DOM
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

const top10FriendsContainer = document.getElementById("top10FriendsContainer");
const logoutBtn = document.getElementById("logoutBtn");

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await loadProfile(user);
});

// LOAD PROFILE
async function loadProfile(user) {
  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;

  const data = snap.data();

  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";

  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // WALL
  wallCommentsContainer.innerHTML = "";
  (data.wallComments || []).forEach(comment => {
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `<strong>${comment.username}</strong>: ${comment.text}`;

    if (comment.userId === user.uid) {
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        await updateDoc(refDoc, {
          wallComments: arrayRemove(comment)
        });
        loadProfile(user);
      };
      div.appendChild(del);
    }

    wallCommentsContainer.appendChild(div);
  });

  // TOP 10
  top10FriendsContainer.innerHTML = "";
  (data.top10Friends || []).forEach(friend => {
    const div = document.createElement("div");
    div.textContent = friend.username;
    top10FriendsContainer.appendChild(div);
  });
}

// SAVE PROFILE INFO
saveProfileBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value
  });

  alert("Profile updated");
};

// SAVE PROFILE PICTURE
saveProfilePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) {
    alert("Select a picture first");
    return;
  }

  const user = auth.currentUser;
  const storageRef = ref(
    storage,
    `profileImages/${user.uid}/${Date.now()}_${file.name}`
  );

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", user.uid), {
    pfpURL: url
  });

  profilePfp.src = url;
  alert("Profile picture updated");
};

// ADD WALL COMMENT
addWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  const comment = {
    text,
    userId: user.uid,
    username: usernameInput.value || "Unknown",
    createdAt: Date.now()
  };

  await updateDoc(doc(db, "users", user.uid), {
    wallComments: arrayUnion(comment)
  });

  wallCommentInput.value = "";
  loadProfile(user);
};

// LOGOUT
logoutBtn.onclick = async () => {
  await auth.signOut();
  window.location.href = "login.html";
};
