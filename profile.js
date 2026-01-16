import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
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
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const friendSearchResults = document.getElementById("friendSearchResults");
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

// NAVIGATION
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("logoutBtn").onclick = () => auth.signOut().then(() => window.location.href = "login.html");

// LOAD PROFILE
async function loadProfile() {
  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    await setDoc(refDoc, {
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
  try {
    const file = profilePfpInput.files[0];
    if (!file) return alert("Select an image");
    const storageRef = ref(storage, `pfp/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
    profilePfp.src = url;
    alert("Profile picture saved");
  } catch {
    alert("Failed to save profile picture");
  }
};

// TOP FRIENDS
addTopFriendBtn.onclick = async () => {
  const searchName = topFriendInput.value.trim();
  if (!searchName) return alert("Enter a username");
  friendSearchResults.innerHTML = "";

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let found = false;

    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.username.toLowerCase() === searchName.toLowerCase() && docSnap.id !== currentUser.uid) {
        found = true;

        const div = document.createElement("div");
        div.className = "friend-search-result";
        div.innerHTML = `
          <img src="${data.pfpURL || 'default-avatar.png'}" width="50" height="50">
          <span class="friend-username">${data.username}</span>
          <button class="sendRequestBtn">Send Friend Request</button>
        `;

        div.querySelector(".friend-username").onclick = () => window.location.href = `/profile.html?user=${data.username}`;

        div.querySelector(".sendRequestBtn").onclick = async () => {
          try {
            await updateDoc(doc(db, "users", docSnap.id), {
              friendRequests: arrayUnion(currentUser.uid)
            });
            div.querySelector(".sendRequestBtn").textContent = "Pending";
            alert("Friend request sent!");
          } catch {
            alert("Failed to send friend request");
          }
        };

        friendSearchResults.appendChild(div);
      }
    });

    if (!found) alert("User not found");
  } catch (err) {
    console.error(err);
    alert("Search failed");
  }
};

function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${index}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${f.username}`;
    };

    div.querySelector("button").onclick = async () => {
      friends.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
      renderTopFriends(friends);
    };

    topFriendsContainer.appendChild(div);
  });
}

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);
  const comments = snap.data().wallComments || [];

  comments.push({ uid: currentUser.uid, user: usernameInput.value, text });

  await updateDoc(refDoc, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${c.user}:</strong> ${c.text}
      ${c.uid === currentUser.uid ? '<button>Delete</button>' : ''}
    `;
    if (c.uid === currentUser.uid) {
      div.querySelector("button").onclick = async () => {
        comments.splice(i, 1);
        await updateDoc(doc(db, "users", currentUser.uid), { wallComments: comments });
        renderWallComments(comments);
      };
    }
    commentContainer.appendChild(div);
  });
}

// MUSIC
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a music URL");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}
