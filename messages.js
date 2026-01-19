// messages.js — FINAL, FULL, SAFE VERSION

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc, deleteDoc,
  onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* =========================
   FIREBASE INIT
========================= */
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

/* =========================
   STATE
========================= */
let currentChatUid = null;
let currentChatUsername = null;
let unsubscribeChat = null;
let selectedMessages = new Set();

/* =========================
   DOM
========================= */
const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");
const conversationsList = document.getElementById("conversationsList");
const emptyState = document.getElementById("emptyState");
const chatSection = document.getElementById("chatSection");
const chatWith = document.getElementById("chatWith");
const chatUserAvatar = document.getElementById("chatUserAvatar");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const closeChatBtn = document.getElementById("closeChatBtn");
const selectAllBtn = document.getElementById("selectAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const notificationSound = document.getElementById("notificationSound");

/* =========================
   NAV
========================= */
document.getElementById("navFeedBtn").onclick = () => location.href = "feed.html";
document.getElementById("navProfileBtn").onclick = () => location.href = "profile.html";
document.getElementById("navMessagesBtn").onclick = () => location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "login.html";
  else loadConversations();
});

/* =========================
   HELPERS
========================= */
function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

/* =========================
   USER SEARCH (RESTORED)
========================= */
searchUserBtn.addEventListener("click", async () => {
  const term = searchUserInput.value.trim().toLowerCase();
  if (!term) return alert("Enter a username");

  searchResults.innerHTML = "<p>Searching...</p>";

  const snap = await getDocs(collection(db, "users"));
  searchResults.innerHTML = "";
  let found = false;

  snap.forEach(docSnap => {
    if (docSnap.id === auth.currentUser.uid) return;

    const user = docSnap.data();
    if ((user.username || "").toLowerCase().includes(term)) {
      found = true;

      const div = document.createElement("div");
      div.className = "search-result";
      div.innerHTML = `
        <strong>${user.username}</strong>
        <button>Message</button>
      `;

      div.querySelector("button").onclick = () => {
        startChat(docSnap.id, user.username, user.photoURL);
        searchResults.innerHTML = "";
        searchUserInput.value = "";
      };

      searchResults.appendChild(div);
    }
  });

  if (!found) searchResults.innerHTML = "<p>No users found</p>";
});

/* =========================
   LOAD CONVERSATIONS
========================= */
function loadConversations() {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", auth.currentUser.uid)
  );

  onSnapshot(q, async snap => {
    conversationsList.innerHTML = "";

    if (snap.empty) {
      conversationsList.innerHTML = "<p>No conversations</p>";
      return;
    }

    for (const docSnap of snap.docs) {
      const conv = docSnap.data();
      const otherUid = conv.participants.find(p => p !== auth.currentUser.uid);

      const userDoc = await getDoc(doc(db, "users", otherUid));
      const user = userDoc.data();

      const div = document.createElement("div");
      div.className = "conversation-item";
      div.innerHTML = `
        <strong>${user.username}</strong>
        <small>${conv.lastMessage || ""}</small>
      `;

      div.onclick = () => startChat(otherUid, user.username, user.photoURL);
      conversationsList.appendChild(div);
    }
  });
}

/* =========================
   START CHAT
========================= */
async function startChat(uid, username, photo) {
  currentChatUid = uid;
  currentChatUsername = username;

  emptyState.style.display = "none";
  chatSection.style.display = "flex";
  chatWith.textContent = username;
  chatUserAvatar.src = photo || "default-avatar.png";

  const convoId = getConversationId(auth.currentUser.uid, uid);
  const convoRef = doc(db, "conversations", convoId);
  const convoDoc = await getDoc(convoRef);

  if (!convoDoc.exists()) {
    await setDoc(convoRef, {
      participants: [auth.currentUser.uid, uid],
      createdAt: serverTimestamp(),
      lastMessage: ""
    });
  }

  loadMessages(convoId);
}

/* =========================
   LOAD MESSAGES
========================= */
function loadMessages(convoId) {
  if (unsubscribeChat) unsubscribeChat();

  const q = query(
    collection(db, "conversations", convoId, "messages"),
    orderBy("createdAt", "asc")
  );

  unsubscribeChat = onSnapshot(q, snap => {
    chatMessages.innerHTML = "";

    snap.forEach(docSnap => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.className = msg.senderId === auth.currentUser.uid ? "message sent" : "message received";
      div.textContent = msg.text;
      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* =========================
   SEND MESSAGE (FIXED)
========================= */
sendMessageBtn.onclick = sendMessage;
messageInput.onkeydown = e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatUid) return;

  const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

  await addDoc(
    collection(db, "conversations", convoId, "messages"),
    {
      text,
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    }
  );

  await updateDoc(doc(db, "conversations", convoId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp()
  });

  console.log("Message sent successfully");

  messageInput.value = "";
}

/* =========================
   CLOSE CHAT
========================= */
closeChatBtn.onclick = () => {
  chatSection.style.display = "none";
  emptyState.style.display = "flex";
  currentChatUid = null;
  if (unsubscribeChat) unsubscribeChat();
};
