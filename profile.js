import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs
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
const friendSearchResults = document.getElementById("friendSearchResults");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUser;

// ---------------- AUTH ----------------
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadProfile();
});

// ---------------- LOAD PROFILE ----------------
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
      pendingRequests: [],
      friends: []
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
  renderPendingRequests(data.pendingRequests || []);
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
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// ---------------- TOP FRIENDS ----------------
addTopFriendBtn.onclick = async () => {
  const name = topFriendInput.value.trim();
  if (!name) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const friends = snap.data().topFriends || [];

  if (friends.length >= 10) return alert("Max 10 friends");

  friends.push({ username: name, uid: null, rank: friends.length + 1 });
  await updateDoc(userRef, { topFriends: friends });
  renderTopFriends(friends);
  topFriendInput.value = "";
};

function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";

    div.innerHTML = `
      <span class="friend-rank">${index + 1}</span>
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${index}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${encodeURIComponent(f.username)}`;
    };

    div.querySelector("button").onclick = async () => {
      friends.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
      renderTopFriends(friends);
    };

    topFriendsContainer.appendChild(div);
  });
}

// ---------------- FRIEND REQUEST SEARCH ----------------
friendSearchInput.addEventListener("input", async () => {
  const queryText = friendSearchInput.value.trim().toLowerCase();
  friendSearchResults.innerHTML = "";

  if (!queryText) return;

  const usersSnap = await getDocs(query(collection(db, "users")));
  usersSnap.forEach(docSnap => {
    const user = docSnap.data();
    const uid = docSnap.id;

    if (user.username.toLowerCase().includes(queryText) && uid !== currentUser.uid) {
      const div = document.createElement("div");
      div.className = "friend-search-result";
      div.innerHTML = `
        <strong>${user.username}</strong>
        <button class="send-request">Add Friend</button>
      `;

      div.querySelector(".send-request").onclick = async () => {
        const targetRef = doc(db, "users", uid);
        const targetSnap = await getDoc(targetRef);
        const pending = targetSnap.data().pendingRequests || [];

        if (pending.includes(currentUser.uid)) return alert("Request already sent");

        pending.push(currentUser.uid);
        await updateDoc(targetRef, { pendingRequests: pending });
        alert("Friend request sent!");
      };

      friendSearchResults.appendChild(div);
    }
  });
});

// ---------------- PENDING FRIEND REQUESTS ----------------
function renderPendingRequests(requests) {
  const container = document.getElementById("pendingRequestsContainer");
  if (!container) return;
  container.innerHTML = "";

  requests.forEach(async (uid, index) => {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return;

    const username = userSnap.data().username || "Unknown";
    const div = document.createElement("div");
    div.className = "pending-request";
    div.innerHTML = `
      <strong>${username}</strong>
      <button class="accept">Accept</button>
      <button class="deny">Deny</button>
    `;

    div.querySelector(".accept").onclick = async () => {
      // Add each other as friends
      const meRef = doc(db, "users", currentUser.uid);
      const meSnap = await getDoc(meRef);
      const myFriends = meSnap.data().friends || [];
      if (!myFriends.includes(uid)) myFriends.push(uid);

      const targetRef = doc(db, "users", uid);
      const targetSnap = await getDoc(targetRef);
      const theirFriends = targetSnap.data().friends || [];
      if (!theirFriends.includes(currentUser.uid)) theirFriends.push(currentUser.uid);

      // Remove from pending
      requests.splice(index, 1);

      await updateDoc(meRef, { friends: myFriends, pendingRequests: requests });
      await updateDoc(targetRef, { friends: theirFriends });

      renderPendingRequests(requests);
    };

    div.querySelector(".deny").onclick = async () => {
      requests.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { pendingRequests: requests });
      renderPendingRequests(requests);
    };

    container.appendChild(div);
  });
}

// ---------------- WALL COMMENTS ----------------
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: currentUser.email.split("@")[0],
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

// ---------------- MUSIC ----------------
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a valid URL");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    if (!id) return alert("Invalid YouTube URL");
    musicPlayerContainer.innerHTML = `
      <iframe width="100%" height="200"
      src="https://www.youtube.com/embed/${id}"
      allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}
