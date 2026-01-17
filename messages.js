import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------
// Firebase Init
// --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --------------------
// DOM Elements
// --------------------
const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

const conversationList = document.getElementById("conversationList");
const chatHeader = document.getElementById("chatHeader");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const attachmentInput = document.getElementById("attachmentInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

// --------------------
// Navigation & Logout
// --------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------
// State
// --------------------
let currentUser = null;
let activeConversationId = null;
let activeUserName = "";

// --------------------
// Auth
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  loadConversations();
});

// --------------------
// Conversation Functions
// --------------------
function generateConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function loadConversations() {
  conversationList.innerHTML = "";
  // Fetch all users to make conversations
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (docSnap.id === currentUser.uid) return; // skip self
    const li = document.createElement("li");
    li.textContent = data.username || "User";
    li.onclick = () => openConversation(docSnap.id, data.username);
    conversationList.appendChild(li);
  });
}

async function openConversation(otherUid, username) {
  activeConversationId = generateConversationId(currentUser.uid, otherUid);
  activeUserName = username;
  chatHeader.textContent = `Chat with ${username}`;
  messagesContainer.innerHTML = "";

  const q = query(collection(db, "messages", activeConversationId, "messages"), orderBy("createdAt", "asc"));
  onSnapshot(q, snap => {
    messagesContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `<strong>${data.username}:</strong> ${data.text || ""}`;
      if (data.mediaURL) {
        if (data.mediaType === "image") div.innerHTML += `<img src="${data.mediaURL}">`;
        if (data.mediaType === "video") div.innerHTML += `<video controls src="${data.mediaURL}"></video>`;
      }
      messagesContainer.appendChild(div);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  });
}

sendMessageBtn?.addEventListener("click", async () => {
  if (!activeConversationId || (!messageInput.value.trim() && !attachmentInput.files[0])) return;

  let mediaURL = "";
  let mediaType = "";

  const file = attachmentInput.files[0];
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const storageRef = ref(storage, `messages/${activeConversationId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "messages", activeConversationId, "messages"), {
    userId: currentUser.uid,
    username: currentUser.displayName || "User",
    text: messageInput.value.trim(),
    mediaURL,
    mediaType,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  attachmentInput.value = "";
});
