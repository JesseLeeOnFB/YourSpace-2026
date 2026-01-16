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

/* DOM */
const incomingRequestsContainer = document.getElementById("incomingRequestsContainer");
const friendInput = document.getElementById("topFriendInput");
const friendPreviewContainer = document.getElementById("friendPreviewContainer");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser;
let currentUserData;

auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;
  await loadProfile();
});

logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

async function loadProfile() {
  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);
  currentUserData = snap.data();
  renderIncomingRequests(currentUserData.incomingRequests || []);
}

/* FRIEND SEARCH */
friendInput.oninput = async () => {
  friendPreviewContainer.innerHTML = "";
  const name = friendInput.value.trim();
  if (!name) return;

  const q = query(collection(db, "users"), where("username", "==", name));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    if (docSnap.id === currentUser.uid) return;
    const u = docSnap.data();

    const div = document.createElement("div");
    div.className = "friend-preview";
    div.innerHTML = `
      <img src="${u.pfpURL || 'default-avatar.png'}">
      <span>${u.username}</span>
      <button>Add</button>
    `;

    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "users", docSnap.id), {
        incomingRequests: (u.incomingRequests || []).concat({
          uid: currentUser.uid,
          username: currentUserData.username
        })
      });
      alert("Friend request sent");
    };

    friendPreviewContainer.appendChild(div);
  });
};

/* INCOMING REQUESTS */
function renderIncomingRequests(requests) {
  incomingRequestsContainer.innerHTML = "";
  requests.forEach((r, index) => {
    const div = document.createElement("div");
    div.className = "request-item";
    div.innerHTML = `
      <span>${r.username}</span>
      <button>Accept</button>
      <button>Deny</button>
    `;

    div.children[1].onclick = async () => {
      currentUserData.topFriends = currentUserData.topFriends || [];
      currentUserData.topFriends.push(r);
      currentUserData.incomingRequests.splice(index, 1);

      await updateDoc(doc(db, "users", currentUser.uid), currentUserData);
      loadProfile();
    };

    div.children[2].onclick = async () => {
      currentUserData.incomingRequests.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), currentUserData);
      loadProfile();
    };

    incomingRequestsContainer.appendChild(div);
  });
}
