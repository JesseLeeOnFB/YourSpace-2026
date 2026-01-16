import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const searchFriendInput = document.getElementById("searchFriendInput");
const friendPreviewContainer = document.getElementById("friendPreviewContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const feedNavBtn = document.getElementById("feedNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

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

// NAVIGATION
feedNavBtn.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// LOAD PROFILE
async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
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

  const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
  alert("Profile picture updated!");
};

// TOP FRIENDS
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";

    div.innerHTML = `
      <img src="${f.pfpURL || 'default-avatar.png'}" class="friend-pfp">
      <strong class="friend-name">${f.username}</strong>
      <span>#${index + 1}</span>
      <button data-index="${index}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      if(f.uid) window.location.href = `/profile.html?user=${f.uid}`;
    };

    div.querySelector("button").onclick = async () => {
      friends.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
      renderTopFriends(friends);
    };

    topFriendsContainer.appendChild(div);
  });
}

// ADD FRIEND SEARCH & PREVIEW
searchFriendInput.addEventListener("input", async () => {
  const queryText = searchFriendInput.value.trim();
  friendPreviewContainer.innerHTML = "";

  if (!queryText) return;

  const q = query(collection(db, "users"), where("username", "==", queryText));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const userData = docSnap.data();
    const userId = docSnap.id;

    // Skip self
    if(userId === currentUser.uid) return;

    const div = document.createElement("div");
    div.className = "friend-preview";
    div.innerHTML = `
      <img src="${userData.pfpURL || 'default-avatar.png'}" class="friend-pfp">
      <strong>${userData.username}</strong>
      <button class="add-friend-btn">Add Friend</button>
      <span class="request-status"></span>
    `;

    const addBtn = div.querySelector(".add-friend-btn");
    const statusSpan = div.querySelector(".request-status");

    addBtn.onclick = async () => {
      try {
        const otherUserRef = doc(db, "users", userId);
        const otherSnap = await getDoc(otherUserRef);
        const otherData = otherSnap.data();
        const existing = otherData.friendRequests || [];

        if (existing.some(r => r.uid === currentUser.uid)) {
          statusSpan.textContent = "Pending";
          return;
        }

        existing.push({ uid: currentUser.uid, username: usernameInput.value, status: "pending" });
        await updateDoc(otherUserRef, { friendRequests: existing });
        statusSpan.textContent = "Pending";
      } catch (err) {
        console.error(err);
        alert("Failed to send friend request");
      }
    };

    friendPreviewContainer.appendChild(div);
  });
});

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value || currentUser.email.split("@")[0],
    text
  });

  await updateDoc(ref, { wallComments: comments });
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
  if (!url) return;

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube.com")) {
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML = `
      <iframe width="100%" height="200"
      src="https://www.youtube.com/embed/${id}"
      allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `
      <audio controls src="${url}"></audio>`;
  }
}
