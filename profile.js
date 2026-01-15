import { auth, db, storage } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

document.addEventListener("DOMContentLoaded", () => {
  // NAV BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  const profilePic = document.getElementById("profilePic");
  const profilePicInput = document.getElementById("profilePicInput");
  const displayNameInput = document.getElementById("displayName");
  const bioInput = document.getElementById("bio");
  const locationInput = document.getElementById("location");
  const musicInput = document.getElementById("music");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveMusicBtn = document.getElementById("saveMusicBtn");

  const topFriendInput = document.getElementById("topFriendInput");
  const addTopFriendBtn = document.getElementById("addTopFriendBtn");
  const topFriendsContainer = document.getElementById("topFriendsContainer");

  const newCommentInput = document.getElementById("newComment");
  const postCommentBtn = document.getElementById("postCommentBtn");
  const wallCommentsContainer = document.getElementById("wallCommentsContainer");

  let currentUser;

  // CHECK AUTH
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    loadProfile();
    loadTopFriends();
    loadWallComments();
  });

  async function loadProfile() {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";

    if (data.profilePic) {
      profilePic.src = data.profilePic;
    }
  }

  saveProfileBtn.addEventListener("click", async () => {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    }, { merge: true });
    alert("Profile info saved!");
  });

  saveMusicBtn.addEventListener("click", async () => {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      music: musicInput.value
    });
    alert("Music link saved!");
  });

  profilePicInput.addEventListener("change", async () => {
    const file = profilePicInput.files[0];
    if (!file) return;
    const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    profilePic.src = downloadURL;
    await updateDoc(doc(db, "users", currentUser.uid), { profilePic: downloadURL });
  });

  addTopFriendBtn.addEventListener("click", async () => {
    const username = topFriendInput.value.trim();
    if (!username) return alert("Enter a username");
    
    // Find user by username
    const usersCol = collection(db, "users");
    const q = await getDoc(doc(usersCol, username)); // assuming username is doc ID
    if (!q.exists()) return alert("User not found");

    await updateDoc(doc(db, "users", currentUser.uid), {
      topFriends: arrayUnion(username)
    });
    topFriendInput.value = "";
    loadTopFriends();
  });

  async function loadTopFriends() {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    topFriendsContainer.innerHTML = "";
    const friends = userSnap.data().topFriends || [];
    friends.forEach(f => {
      const div = document.createElement("div");
      div.textContent = f;
      topFriendsContainer.appendChild(div);
    });
  }

  postCommentBtn.addEventListener("click", async () => {
    const commentText = newCommentInput.value.trim();
    if (!commentText) return;

    const commentData = {
      userId: currentUser.uid,
      username: currentUser.displayName || "Anonymous",
      text: commentText,
      createdAt: new Date()
    };
    await updateDoc(doc(db, "users", currentUser.uid), {
      wallComments: arrayUnion(commentData)
    });
    newCommentInput.value = "";
    loadWallComments();
  });

  async function loadWallComments() {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    wallCommentsContainer.innerHTML = "";
    const comments = userSnap.data().wallComments || [];
    comments.forEach(c => {
      const div = document.createElement("div");
      div.className = "wall-comment";
      div.textContent = `${c.username}: ${c.text}`;
      wallCommentsContainer.appendChild(div);
    });
  }
});
