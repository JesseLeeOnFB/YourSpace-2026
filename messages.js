import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase Init
// ---------------------
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

// ---------------------
// DOM Elements
// ---------------------
const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

const conversationList = document.getElementById("conversationList");
const conversationsContainer = document.getElementById("conversationsContainer");
const chatContainer = document.getElementById("chatContainer");
const chatWithEl = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const attachmentInput = document.getElementById("attachmentInput");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");

// ---------------------
// State
// ---------------------
let currentUser = null;
let activeConversationId = null;

// ---------------------
// Navigation
// ---------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Auth
// ---------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadConversations();
});

// ---------------------
// Load Conversations
// ---------------------
async function loadConversations() {
  conversationList.innerHTML = "";
  const q = query(collection(db, "messages"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const conv = docSnap.data();
    const li = document.createElement("li");
    const otherUserId = conv.userIds.find(id => id !== currentUser.uid);
    li.textContent = conv.name || "Conversation";
    li.onclick = () => openConversation(docSnap.id, otherUserId);
    conversationList.appendChild(li);
  });
}

// ---------------------
// Open Conversation
// ---------------------
async function openConversation(convId, otherUserId) {
  activeConversationId = convId;
  conversationsContainer.style.display = "none";
  chatContainer.style.display = "block";

  const otherUserSnap = await getDoc(doc(db, "users", otherUserId));
  const otherUserName = otherUserSnap.data()?.username || "User";
  chatWithEl.textContent = `Chat with ${otherUserName}`;

  loadMessages();
}

// ---------------------
// Load Messages
// ---------------------
async function loadMessages() {
  messagesContainer.innerHTML = "";

  if (!activeConversationId) return;

  const q = query(
    collection(db, "messages", activeConversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  snap.forEach(msgSnap => {
    const data = msgSnap.data();
    const div = document.createElement("div");
    div.className = "message " + (data.userId === currentUser.uid ? "self" : "other");
    div.innerHTML = `
      ${data.text || ""}
      ${data.mediaURL ? `<br><a href="${data.mediaURL}" target="_blank">Attachment</a>` : ""}
    `;
    messagesContainer.appendChild(div);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ---------------------
// Send Message
// ---------------------
sendBtn?.addEventListener("click", async () => {
  if (!activeConversationId) return;
  const text = messageInput.value.trim();
  const file = attachmentInput.files[0];

  let mediaURL = "";
  if (file) {
    const storageRef = ref(storage, `messages/${activeConversationId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  if (!text && !mediaURL) return;

  await addDoc(collection(db, "messages", activeConversationId, "messages"), {
    userId: currentUser.uid,
    text,
    mediaURL,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  attachmentInput.value = "";
  loadMessages();
});

// ---------------------
// Back Button
// ---------------------
backBtn?.addEventListener("click", () => {
  chatContainer.style.display = "none";
  conversationsContainer.style.display = "block";
  activeConversationId = null;
});
