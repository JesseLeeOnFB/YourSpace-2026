import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
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
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUser;

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadProfile();
});

// LOAD PROFILE
async function loadProfile() {
  const refUser = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refUser);

  if (!snap.exists()) {
    await setDoc(refUser, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      topFriends: [],
      wallComments: [],
      musicURL: "",
      friendRequests: []
    });
    return loadProfile();
  }

  const data = snap.data();
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  profilePfp.src = data.pfpURL || "default-avatar.png";

  renderTopFriends(data.topFriends || []);
  renderWallComments(data.wallComments || []);
  if (data.musicURL) renderMusic(data.musicURL);
}

// SAVE PROFILE INFO
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// SAVE PROFILE PICTURE
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  try {
    const storageRef = ref(storage, `pfp/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
    profilePfp.src = url;
    alert("Profile picture saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile picture.");
  }
};

// TOP FRIENDS + ADD FRIEND REQUEST
addTopFriendBtn.onclick = async () => {
  const username = topFriendInput.value.trim();
  if (!username) return;

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnap = await getDocs(q);

    if (querySnap.empty) return alert("User not found");

    const targetDoc = querySnap.docs[0];
    const targetId = targetDoc.id;

    await updateDoc(doc(db, "users", targetId), {
      friendRequests: arrayUnion(currentUser.uid)
    });

    topFriendInput.value = "";
    alert("Friend request sent! Pending approval.");
  } catch (err) {
    console.error(err);
    alert("Failed to send friend request.");
  }
};

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const refUser = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refUser);
  const comments = snap.data().wallComments || [];
  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value || currentUser.email.split("@")[0],
    text
  });
  await updateDoc(refUser, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${c.user}:</strong> ${c.text}
      <button>Delete</button>
    `;
    div.querySelector("button").onclick = async () => {
      comments.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { wallComments: comments });
      renderWallComments(comments);
    };
    commentContainer.appendChild(div);
  });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a URL to play music");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (!url) return;
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let id = "";
    if (url.includes("v=")) id = url.split("v=")[1]?.split("&")[0];
    else if (url.includes("youtu.be")) id = url.split("youtu.be/")[1]?.split("?")[0];
    if (id) {
      musicPlayerContainer.innerHTML = `<iframe width="100%" height="200"
      src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
      return;
    }
  }
  musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
}

// NAVIGATION
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  window.location.href = "login.html";
};
