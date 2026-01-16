import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion
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

const friendSearchInput = document.getElementById("friendSearchInput");
const searchResultsContainer = document.getElementById("searchResultsContainer");

const friendRequestsContainer = document.getElementById("friendRequestsContainer");

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
  await loadProfile();
  await loadFriendRequests();
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
};

// FRIEND SEARCH
friendSearchInput?.addEventListener("input", async () => {
  const queryName = friendSearchInput.value.trim().toLowerCase();
  searchResultsContainer.innerHTML = "";
  if (!queryName) return;

  const usersSnap = await getDoc(doc(db, "users", "allUsers")); // Optional: maintain all users list for quick search
  // Otherwise loop through your collection and match username (simplified example)
  const usersCollectionSnap = await getDoc(doc(db, "users", currentUser.uid));
  // For demo purposes we just show dummy user if matches
  if ("daniellew".includes(queryName)) {
    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `
      <span>DanielleW</span>
      <button class="send-request-btn">Add Friend</button>
    `;
    div.querySelector(".send-request-btn").onclick = async () => {
      await sendFriendRequest("daniellew-uid", "DanielleW");
    };
    searchResultsContainer.appendChild(div);
  }
});

// SEND FRIEND REQUEST
async function sendFriendRequest(targetUid, targetUsername) {
  try {
    const targetRef = doc(db, "users", targetUid);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) return alert("User not found");

    await updateDoc(targetRef, {
      friendRequests: arrayUnion({ uid: currentUser.uid, username: usernameInput.value, status: "pending" })
    });
    alert(`Friend request sent to ${targetUsername}`);
  } catch (err) {
    console.error(err);
    alert("Failed to send friend request");
  }
}

// LOAD FRIEND REQUESTS
async function loadFriendRequests() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();
  const requests = data.friendRequests || [];

  friendRequestsContainer.innerHTML = "";
  requests.forEach((req, index) => {
    if (req.status === "pending") {
      const div = document.createElement("div");
      div.className = "friend-request";
      div.innerHTML = `
        <span>${req.username}</span>
        <button class="accept-btn">Accept</button>
        <button class="deny-btn">Deny</button>
      `;
      div.querySelector(".accept-btn").onclick = async () => {
        await acceptFriend(req.uid, req.username, index);
      };
      div.querySelector(".deny-btn").onclick = async () => {
        await denyFriend(req.uid, index);
      };
      friendRequestsContainer.appendChild(div);
    }
  });
}

// ACCEPT FRIEND
async function acceptFriend(friendUid, friendUsername, index) {
  const refUser = doc(db, "users", currentUser.uid);
  const snapUser = await getDoc(refUser);
  const dataUser = snapUser.data();

  const updatedRequests = dataUser.friendRequests;
  updatedRequests[index].status = "accepted";

  const friends = dataUser.friends || [];
  friends.push({ uid: friendUid, username: friendUsername });

  await updateDoc(refUser, {
    friendRequests: updatedRequests,
    friends
  });

  alert(`You are now friends with ${friendUsername}`);
  loadFriendRequests();
}

// DENY FRIEND
async function denyFriend(friendUid, index) {
  const refUser = doc(db, "users", currentUser.uid);
  const snapUser = await getDoc(refUser);
  const dataUser = snapUser.data();

  const updatedRequests = dataUser.friendRequests;
  updatedRequests.splice(index, 1);

  await updateDoc(refUser, { friendRequests: updatedRequests });
  loadFriendRequests();
}

// TOP FRIENDS (can only add confirmed friends)
addTopFriendBtn.onclick = async () => {
  const name = topFriendInput.value.trim();
  if (!name) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const friends = snap.data().friends || [];
  const topFriends = snap.data().topFriends || [];

  if (topFriends.length >= 10) return alert("Max 10 Top Friends");

  const friend = friends.find(f => f.username.toLowerCase() === name.toLowerCase());
  if (!friend) return alert("Friend must be confirmed first");

  topFriends.push({ username: friend.username, uid: friend.uid, rank: topFriends.length + 1 });
  await updateDoc(ref, { topFriends });
  renderTopFriends(topFriends);
  topFriendInput.value = "";
};

function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";

  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <span>#${f.rank} - <strong class="friend-name">${f.username}</strong></span>
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

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value,
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
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text} <button>Delete</button>`;
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
  if (!url) return alert("Please enter a valid link");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  let embedHTML = "";

  if (url.includes("youtu.be")) {
    const id = url.split("youtu.be/")[1].split("?")[0];
    embedHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else if (url.includes("youtube.com/watch")) {
    const id = url.split("v=")[1]?.split("&")[0];
    embedHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else if (url.includes("soundcloud.com") || url.includes("spotify.com")) {
    embedHTML = `<iframe width="100%" height="200" src="${url}" allow="autoplay" allowfullscreen></iframe>`;
  } else {
    embedHTML = `<audio controls src="${url}"></audio>`;
  }

  musicPlayerContainer.innerHTML = embedHTML;
}
