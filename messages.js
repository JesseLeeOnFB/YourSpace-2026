// messages.js – EXACT SAME CODE + console.log added

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc, deleteDoc,
  onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

let currentChatUid = null;
let currentChatUsername = null;
let unsubscribeChat = null;
let selectedMessages = new Set();

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

document.getElementById("navFeedBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("navProfileBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("navMessagesBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadConversations();
    requestNotificationPermission();
  }
});

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "favicon.ico" });
  }
  notificationSound.play().catch(() => {});
}

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function startChat(otherUid, otherUsername, otherPhoto) {
  currentChatUid = otherUid;
  currentChatUsername = otherUsername;

  emptyState.style.display = "none";
  chatSection.style.display = "flex";

  chatWith.textContent = otherUsername;
  chatUserAvatar.src = otherPhoto || "default-avatar.png";

  selectedMessages.clear();
  deleteSelectedBtn.style.display = "none";

  const convoId = getConversationId(auth.currentUser.uid, otherUid);
  const convRef = doc(db, "conversations", convoId);
  const convDoc = await getDoc(convRef);

  if (!convDoc.exists()) {
    await setDoc(convRef, {
      participants: [auth.currentUser.uid, otherUid],
      createdAt: serverTimestamp(),
      lastMessage: ""
    });
  }

  loadMessages(convoId);
}

function loadMessages(convoId) {
  if (unsubscribeChat) unsubscribeChat();

  const messagesRef = collection(db, "conversations", convoId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgDiv = document.createElement("div");
      msgDiv.className = msg.senderId === auth.currentUser.uid ? "message sent" : "message received";
      msgDiv.dataset.id = docSnap.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "message-checkbox";

      const textSpan = document.createElement("span");
      textSpan.textContent = msg.text;

      const timeSpan = document.createElement("small");
      timeSpan.textContent = msg.createdAt
        ? new Date(msg.createdAt.toMillis()).toLocaleTimeString()
        : "Sending...";

      msgDiv.appendChild(checkbox);
      msgDiv.appendChild(textSpan);
      msgDiv.appendChild(timeSpan);

      chatMessages.appendChild(msgDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

sendMessageBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatUid) return;

  const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

  try {
    await addDoc(collection(db, "conversations", convoId, "messages"), {
      text,
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "conversations", convoId), {
      lastMessage: text.substring(0, 50),
      lastMessageTime: serverTimestamp()
    });

    console.log("Message sent successfully"); // ✅ ADDED LINE

    messageInput.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Error sending message");
  }
}
