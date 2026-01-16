import { auth, db, storage } from "./firebase.js";
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// NAVIGATION
document.getElementById("feedBtn").addEventListener("click", () => { window.location.href = "feed.html"; });
document.getElementById("profileBtn").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("logoutBtn").addEventListener("click", async () => { await auth.signOut(); window.location.href = "login.html"; });

// ELEMENTS
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const addFriendPreview = document.getElementById("addFriendPreview");
const topFriendsList = document.getElementById("topFriendsList");
const wallCommentsList = document.getElementById("wallCommentsList");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

// LOAD PROFILE INFO
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "login.html";
  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-profile.png";

    // Wall comments
    wallCommentsList.innerHTML = "";
    if (data.wallComments) {
      data.wallComments.forEach(c => {
        const li = document.createElement("li");
        li.textContent = `${c.username}: ${c.comment}`;
        wallCommentsList.appendChild(li);
      });
    }

    // Top friends
    topFriendsList.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        topFriendsList.appendChild(li);
      });
    }
  }
});

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userDocRef = doc(db, "users", user.uid);
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
    profilePfp.src = url;
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile picture");
  }
});

// WALL COMMENTS
postWallCommentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  if (!wallCommentInput.value.trim()) return;
  const comment = { username: usernameInput.value, comment: wallCommentInput.value };
  try {
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      wallComments: [...(userDocRef.wallComments || []), comment]
    });
    const li = document.createElement("li");
    li.textContent = `${comment.username}: ${comment.comment}`;
    wallCommentsList.appendChild(li);
    wallCommentInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to post comment");
  }
});

// MUSIC PLAYER
saveMusicBtn.addEventListener("click", () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Please enter a valid music/video URL");
  musicPlayer.innerHTML = `<iframe width="300" height="80" src="${url}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
});
