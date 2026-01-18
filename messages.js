// messages.js – Private 1-on-1 messaging

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

const chatSection = document.getElementById("chatSection");
const chatWith = document.getElementById("chatWith");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

let currentChatUid = null;
let unsubscribeChat = null;

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

searchUserBtn.addEventListener("click", async () => {
  const term = searchUserInput.value.trim();
  if (!term) return;

  searchResults.innerHTML = "Searching...";

  const q = query(collection(db, "users"), where("username", "==", term));
  const snap = await getDocs(q);

  searchResults.innerHTML = "";

  if (snap.empty) {
    searchResults.innerHTML = "No user found";
    return;
  }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (docSnap.id === auth.currentUser.uid) return;

    const btn = document.createElement("button");
    btn.textContent = data.username;
    btn.onclick = () => startChat(docSnap.id, data.username);
    searchResults.appendChild(btn);
  });
});

function startChat(otherUid, otherUsername) {
  currentChatUid = otherUid;
  chatWith.textContent = otherUsername;
  chatSection.style.display = "block";
  chatMessages.innerHTML = "";

  const convoId = getConversationId(auth.currentUser.uid, otherUid);
  const messagesQ = query(collection(db, "messages", convoId, "messages"), orderBy("createdAt"));

  if (unsubscribeChat) unsubscribeChat();

  unsubscribeChat = onSnapshot(messagesQ, (snap) => {
    chatMessages.innerHTML = "";

    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const div = document.createElement("div");
      div.className = m.sender === auth.currentUser.uid ? "sent" : "received";
      div.textContent = m.text;
      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

sendMessageBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text || !currentChatUid) return;

  const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

  await addDoc(collection(db, "messages", convoId, "messages"), {
    text,
    sender: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
});
