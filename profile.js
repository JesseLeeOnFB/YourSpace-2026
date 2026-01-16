// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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

// DOM Elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResultsContainer = document.getElementById("searchResultsContainer");
const pendingRequestsContainer = document.getElementById("pendingRequestsContainer");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const friendsContainer = document.getElementById("friendsContainer");

let currentUser;

// AUTH CHECK
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProfile();
  await loadPendingRequests();
});

// ---------------- PROFILE LOAD ----------------
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
      friends: [],
      friendRequests: [],
      wallComments: [],
      musicURL: ""
    });
    return loadProfile();
  }

  const data = snap.data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  profilePfp.src = data.pfpURL || "default-avatar.png";

  renderTopFriends(data.topFriends || []);
  renderFriends(data.friends || []);
  renderWallComments(data.wallComments || []);
  if (data.musicURL) renderMusic(data.musicURL);
}

// ---------------- SAVE PROFILE INFO ----------------
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// ---------------- SAVE PROFILE PICTURE ----------------
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
  try {
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

// ---------------- WALL COMMENTS ----------------
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);
  const comments = snap.data().wallComments || [];
  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value || currentUser.email.split("@")[0],
    text
  });
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

// ---------------- MUSIC PLAYER ----------------
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a URL");
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

// ---------------- TOP FRIENDS ----------------
function renderTopFriends(topFriends) {
  topFriendsContainer.innerHTML = "";
  topFriends.forEach((f, idx) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<strong>${idx + 1}. ${f.username}</strong>
                     <button data-index="${idx}">Remove</button>`;
    div.querySelector("button").onclick = async () => {
      topFriends.splice(idx, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends });
      renderTopFriends(topFriends);
    };
    topFriendsContainer.appendChild(div);
  });
}

// ---------------- ALL FRIENDS ----------------
function renderFriends(friends) {
  friendsContainer.innerHTML = "";
  friends.forEach((f, idx) => {
    const div = document.createElement("div");
    div.className = "friend";
    div.innerHTML = `<strong>${f.username}</strong>`;
    div.querySelector("strong").onclick = () => {
      window.location.href = `/profile.html?user=${f.uid}`;
    };
    friendsContainer.appendChild(div);
  });
}

// ---------------- SEARCH & ADD FRIEND ----------------
searchUserBtn.onclick = async () => {
  const queryText = searchUserInput.value.trim();
  if (!queryText) return;

  searchResultsContainer.innerHTML = "Searching...";
  const usersRef = collection(db, "users");
  const q1 = query(usersRef, where("username", "==", queryText));
  const q2 = query(usersRef, where("email", "==", queryText));
  const results1 = await getDocs(q1);
  const results2 = await getDocs(q2);
  const usersFound = [...results1.docs, ...results2.docs].filter(doc => doc.id !== currentUser.uid);

  searchResultsContainer.innerHTML = "";
  if (!usersFound.length) {
    searchResultsContainer.innerText = "No users found";
    return;
  }

  usersFound.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `
      <img src="${data.pfpURL || 'default-avatar.png'}" width="40" height="40">
      <strong>${data.username}</strong>
      <button>Add Friend</button>
    `;
    div.querySelector("button").onclick = async () => {
      try {
        // Update target user's friendRequests array
        const targetRef = doc(db, "users", docSnap.id);
        const snap = await getDoc(targetRef);
        const requests = snap.data().friendRequests || [];
        if (requests.includes(currentUser.uid)) return alert("Request already sent");
        requests.push(currentUser.uid);
        await updateDoc(targetRef, { friendRequests: requests });
        div.querySelector("button").innerText = "Pending";
      } catch (err) {
        console.error(err);
        alert("Failed to send friend request");
      }
    };
    searchResultsContainer.appendChild(div);
  });
};

// ---------------- PENDING REQUESTS ----------------
async function loadPendingRequests() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const requests = snap.data().friendRequests || [];
  pendingRequestsContainer.innerHTML = "";

  for (const uid of requests) {
    const userSnap = await getDoc(doc(db, "users", uid));
    const data = userSnap.data();
    const div = document.createElement("div");
    div.className = "pending-request";
    div.innerHTML = `
      <img src="${data.pfpURL || 'default-avatar.png'}" width="40" height="40">
      <strong>${data.username}</strong>
      <button class="accept-btn">Accept</button>
      <button class="deny-btn">Deny</button>
    `;
    div.querySelector(".accept-btn").onclick = async () => {
      // Add to friends for both users
      const meSnap = await getDoc(doc(db, "users", currentUser.uid));
      const meFriends = meSnap.data().friends || [];
      meFriends.push({ username: data.username, uid });
      const targetSnap = await getDoc(doc(db, "users", uid));
      const targetFriends = targetSnap.data().friends || [];
      targetFriends.push({ username: meSnap.data().username, uid: currentUser.uid });
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: meFriends,
        friendRequests: requests.filter(rid => rid !== uid)
      });
      await updateDoc(doc(db, "users", uid), { friends: targetFriends });
      loadPendingRequests();
      renderFriends(meFriends);
    };
    div.querySelector(".deny-btn").onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friendRequests: requests.filter(rid => rid !== uid)
      });
      loadPendingRequests();
    };
    pendingRequestsContainer.appendChild(div);
  }
}
