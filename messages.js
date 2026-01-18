import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
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

// DOM Elements
const searchInput = document.getElementById("searchUserInput");
const searchResults = document.getElementById("searchResults");
const chatSection = document.getElementById("chatSection");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatFile = document.getElementById("chatFile");
const sendBtn = document.getElementById("sendBtn");

document.getElementById("navFeed").onclick = () => window.location.href = "feed.html";
document.getElementById("navProfile").onclick = () => window.location.href = "profile.html";
document.getElementById("navMessages").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => { await signOut(auth); window.location.href = "login.html"; };

let currentUser = null;
let activeConversationId = null;
let activeRecipient = null;

// Auth
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
});

// Search users
searchInput.addEventListener("input", async () => {
  const qText = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if (!qText) return;

  const q = query(collection(db, "users"), where("username_lower", ">= ", qText), where("username_lower", "<=", qText + "\uf8ff"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const div = document.createElement("div");
    div.textContent = docSnap.data().username;
    div.onclick = () => openConversation(docSnap.id, docSnap.data().username);
    searchResults.appendChild(div);
  });
});

// Open conversation
async function openConversation(uid, username) {
  activeRecipient = { uid, username };
  chatHeader.textContent = `Chat with ${username}`;
  chatSection.style.display = "block";
  searchResults.innerHTML = "";
  searchInput.value = "";

  // Generate deterministic conversationId
  activeConversationId = [currentUser.uid, uid].sort().join("_");

  loadMessages();
}

// Load messages
async function loadMessages() {
  chatMessages.innerHTML = "";
  const q = query(collection(db, "messages", activeConversationId, "messages"), orderBy("createdAt"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "chatMessage";
    let mediaHTML = "";
    if (data.file) {
      if (data.fileType.startsWith("image")) mediaHTML = `<img src="${data.file}" />`;
      else if (data.fileType.startsWith("video")) mediaHTML = `<video controls src="${data.file}"></video>`;
    }
    div.innerHTML = `<strong>${data.username}:</strong> ${data.text} ${mediaHTML}`;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
sendBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text && !chatFile.files[0]) return;

  let fileURL = "";
  let fileType = "";
  if (chatFile.files[0]) {
    const file = chatFile.files[0];
    const fileRef = ref(storage, `messages/${activeConversationId}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    fileURL = await getDownloadURL(fileRef);
    fileType = file.type;
  }

  await addDoc(collection(db, "messages", activeConversationId, "messages"), {
    text,
    file: fileURL,
    fileType,
    userId: currentUser.uid,
    username: (await getDoc(doc(db, "users", currentUser.uid))).data().username || "User",
    createdAt: serverTimestamp()
  });

  chatInput.value = "";
  chatFile.value = "";
  loadMessages();
});
