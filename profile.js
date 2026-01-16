import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

const top10FriendsContainer = document.getElementById("top10FriendsContainer");

let currentUserRef = null;
let currentUserData = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  currentUserRef = doc(db, "users", user.uid);
  await loadProfile();
});

async function loadProfile() {
  const snap = await getDoc(currentUserRef);
  if (!snap.exists()) return;

  currentUserData = snap.data();

  usernameInput.value = currentUserData.username || "";
  bioInput.value = currentUserData.bio || "";
  locationInput.value = currentUserData.location || "";

  if (currentUserData.pfpURL) {
    profilePfp.src = currentUserData.pfpURL;
  }

  loadWallComments();
  loadTopFriends();
}

function loadWallComments() {
  wallCommentsContainer.innerHTML = "";

  const comments = currentUserData.wallComments || [];
  comments.forEach((comment) => {
    const div = document.createElement("div");
    div.className = "wall-comment";

    div.innerHTML = `
      <strong>${comment.username}</strong>: ${comment.text}
      ${comment.userId === auth.currentUser.uid ? `<button>Delete</button>` : ""}
    `;

    if (comment.userId === auth.currentUser.uid) {
      div.querySelector("button").onclick = async () => {
        await updateDoc(currentUserRef, {
          wallComments: arrayRemove(comment)
        });
        await loadProfile();
      };
    }

    wallCommentsContainer.appendChild(div);
  });
}

function loadTopFriends() {
  top10FriendsContainer.innerHTML = "";

  const friends = currentUserData.top10Friends || [];
  friends.forEach((friend) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.textContent = friend.username;
    top10FriendsContainer.appendChild(div);
  });
}

saveProfileBtn.onclick = async () => {
  await updateDoc(currentUserRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile updated");
};

saveProfilePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select a picture first");

  const storageRef = ref(
    storage,
    `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`
  );

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(currentUserRef, { pfpURL: url });
  profilePfp.src = url;
};

addWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const comment = {
    text,
    userId: auth.currentUser.uid,
    username: currentUserData.username || "Unknown",
    timestamp: Date.now()
  };

  await updateDoc(currentUserRef, {
    wallComments: arrayUnion(comment)
  });

  wallCommentInput.value = "";
  await loadProfile();
};
