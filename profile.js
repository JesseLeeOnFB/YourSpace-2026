import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs
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

const feedBtn = document.getElementById("feedBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePfp = document.getElementById("profilePfp");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const profilePfpInput = document.getElementById("profilePfpInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const commentContainer = document.getElementById("commentContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const friendSearchInput = document.getElementById("friendSearchInput");
const friendPreviewContainer = document.getElementById("friendPreviewContainer");
const incomingRequestsContainer = document.getElementById("incomingRequestsContainer");

let currentUser;
let userData;

feedBtn.onclick = () => window.location.href = "feed.html";
logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;
  await loadProfile();
});

async function loadProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  userData = snap.data();

  usernameInput.value = userData.username || "";
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  if (userData.pfpURL) profilePfp.src = userData.pfpURL;

  renderWall();
  renderIncomingRequests();
}

saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile saved");
};

saveProfilePhotoBtn.onclick = async () => {
  if (!profilePfpInput.files[0]) return alert("Select an image");
  const file = profilePfpInput.files[0];
  const storageRef = ref(storage, `profileImages/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

postWallCommentBtn.onclick = async () => {
  const comment = wallCommentInput.value.trim();
  if (!comment) return;
  userData.wall = userData.wall || [];
  userData.wall.push({
    text: comment,
    username: userData.username,
    time: Date.now()
  });
  await updateDoc(doc(db, "users", currentUser.uid), { wall: userData.wall });
  wallCommentInput.value = "";
  renderWall();
};

function renderWall() {
  commentContainer.innerHTML = "";
  (userData.wall || []).forEach(c => {
    const div = document.createElement("div");
    div.textContent = `${c.username}: ${c.text}`;
    commentContainer.appendChild(div);
  });
}

/* FRIEND SEARCH + REQUEST */
friendSearchInput.oninput = async () => {
  friendPreviewContainer.innerHTML = "";
  const name = friendSearchInput.value.trim();
  if (!name) return;

  const q = query(collection(db, "users"), where("username", "==", name));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    if (docSnap.id === currentUser.uid) return;
    const u = docSnap.data();

    const div = document.createElement("div");
    div.className = "friend-preview";
    div.innerHTML = `<span>${u.username}</span><button>Add</button>`;
    div.querySelector("button").onclick = async () => {
      const targetRef = doc(db, "users", docSnap.id);
      await updateDoc(targetRef, {
        incomingRequests: (u.incomingRequests || []).concat({
          uid: currentUser.uid,
          username: userData.username
        })
      });
      alert("Friend request sent");
    };
    friendPreviewContainer.appendChild(div);
  });
};

function renderIncomingRequests() {
  incomingRequestsContainer.innerHTML = "";
  (userData.incomingRequests || []).forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "request-item";
    div.innerHTML = `<span>${r.username}</span>
      <button>Accept</button>
      <button>Deny</button>`;
    div.children[1].onclick = async () => {
      userData.incomingRequests.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), userData);
      loadProfile();
    };
    div.children[2].onclick = async () => {
      userData.incomingRequests.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), userData);
      loadProfile();
    };
    incomingRequestsContainer.appendChild(div);
  });
}
