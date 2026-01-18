import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, query,
  where, addDoc, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------
// Firebase Config
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
const convItems = document.getElementById("convItems");
const newConvInput = document.getElementById("newConvInput");
const newConvBtn = document.getElementById("newConvBtn");

const chatWith = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const messageFileInput = document.getElementById("messageFileInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------
// State
// --------------------
let currentUser = null;
let currentConvId = null;
let currentConvUser = null;

// --------------------
// Navigation
// --------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------
// Auth State
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  currentUser = user;
  loadConversations();
});

// --------------------
// Load Conversations
// --------------------
async function loadConversations() {
  convItems.innerHTML = "";
  const q = query(collection(db, "users"), where("conversations", "array-contains", currentUser.uid));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const otherUid = data.uid === currentUser.uid ? null : data.uid;
    if (!otherUid) return;

    const btn = document.createElement("button");
    btn.textContent = data.username || "User";
    btn.onclick = () => openConversation(otherUid, data.username);
    convItems.appendChild(btn);
  });
}

// --------------------
// Start New Conversation
// --------------------
newConvBtn?.addEventListener("click", async () => {
  const username = newConvInput.value.trim();
  if (!username) return;

  // Find user by username
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (snap.empty) return alert("User not found");

  const otherUser = snap.docs[0].data();
  const otherUid = snap.docs[0].id;
  openConversation(otherUid, otherUser.username);
});

// --------------------
// Open Conversation
// --------------------
async function openConversation(uid, username) {
  currentConvId = uid > currentUser.uid ? `${currentUser.uid}_${uid}` : `${uid}_${currentUser.uid}`;
  currentConvUser = uid;
  chatWith.textContent = `Chat with ${username}`;
  loadMessages();
}

// --------------------
// Load Messages
// --------------------
async function loadMessages() {
  messagesContainer.innerHTML = "";
  if (!currentConvId) return;

  const q = query(collection(db, "messages", currentConvId, "messages"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "message " + (data.senderId === currentUser.uid ? "own" : "other");
    if (data.fileURL) {
      div.innerHTML = `<strong>${data.senderName}:</strong> ${data.text} <br><a href="${data.fileURL}" target="_blank">Attachment</a>`;
    } else {
      div.innerHTML = `<strong>${data.senderName}:</strong> ${data.text}`;
    }
    messagesContainer.appendChild(div);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --------------------
// Send Message
// --------------------
sendMessageBtn?.addEventListener("click", async () => {
  if (!messageInput.value.trim() && !messageFileInput.files[0]) return;

  let fileURL = "";
  const file = messageFileInput.files[0];
  if (file) {
    const storageRef = ref(storage, `messages/${currentConvId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const senderSnap = await getDoc(doc(db, "users", currentUser.uid));
  const senderName = senderSnap.data()?.username || "User";

  await addDoc(collection(db, "messages", currentConvId, "messages"), {
    text: messageInput.value.trim(),
    senderId: currentUser.uid,
    senderName,
    fileURL,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  messageFileInput.value = "";
  loadMessages();
});
