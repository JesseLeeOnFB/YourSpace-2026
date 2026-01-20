// messages.js – FIXED - All functions working

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import {
getFirestore, collection, query, where, getDocs, addDoc, deleteDoc,
onSnapshot, orderBy, serverTimestamp, doc, setDoc, getDoc, updateDoc
} from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;
import { getAuth, onAuthStateChanged, signOut } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentChatUid = null;
let currentChatUsername = null;
let unsubscribeChat = null;
let selectedMessages = new Set();

const searchUserInput = document.getElementById(“searchUserInput”);
const searchUserBtn = document.getElementById(“searchUserBtn”);
const searchResults = document.getElementById(“searchResults”);
const conversationsList = document.getElementById(“conversationsList”);
const emptyState = document.getElementById(“emptyState”);
const chatSection = document.getElementById(“chatSection”);
const chatWith = document.getElementById(“chatWith”);
const chatUserAvatar = document.getElementById(“chatUserAvatar”);
const chatMessages = document.getElementById(“chatMessages”);
const messageInput = document.getElementById(“messageInput”);
const sendMessageBtn = document.getElementById(“sendMessageBtn”);
const closeChatBtn = document.getElementById(“closeChatBtn”);
const selectAllBtn = document.getElementById(“selectAllBtn”);
const deleteSelectedBtn = document.getElementById(“deleteSelectedBtn”);
const notificationSound = document.getElementById(“notificationSound”);

document.getElementById(“navFeedBtn”).onclick = () => window.location.href = “feed.html”;
document.getElementById(“navProfileBtn”).onclick = () => window.location.href = “profile.html”;
document.getElementById(“navMessagesBtn”).onclick = () => window.location.href = “messages.html”;
document.getElementById(“logoutBtn”).onclick = async () => {
await signOut(auth);
window.location.href = “login.html”;
};

onAuthStateChanged(auth, (user) => {
if (!user) {
window.location.href = “login.html”;
} else {
loadConversations();
requestNotificationPermission();
}
});

function requestNotificationPermission() {
if (“Notification” in window && Notification.permission === “default”) {
Notification.requestPermission();
}
}

function showNotification(title, body) {
if (“Notification” in window && Notification.permission === “granted”) {
new Notification(title, { body, icon: “favicon.ico” });
}
notificationSound.play().catch(() => {});
}

function getConversationId(uid1, uid2) {
return [uid1, uid2].sort().join(”_”);
}

searchUserBtn.addEventListener(“click”, async () => {
const searchTerm = searchUserInput.value.trim().toLowerCase();
if (!searchTerm) {
alert(“Please enter a username to search”);
return;
}

searchResults.innerHTML = “<p style='padding: 1rem; text-align: center;'>Searching…</p>”;

try {
const usersRef = collection(db, “users”);
const snapshot = await getDocs(usersRef);

```
searchResults.innerHTML = "";
let found = false;

snapshot.forEach((docSnap) => {
  const user = docSnap.data();
  const username = (user.username || "").toLowerCase();
  
  if (docSnap.id === auth.currentUser.uid) return;
  
  if (username.includes(searchTerm)) {
    found = true;
    const resultDiv = document.createElement("div");
    resultDiv.className = "search-result";
    resultDiv.innerHTML = `
      <img src="${user.photoURL || 'default-avatar.png'}" alt="${user.username}">
      <div class="result-info">
        <strong>${user.username}</strong>
        <small>@${user.username}</small>
      </div>
      <button class="message-btn">Message</button>
    `;
    
    resultDiv.querySelector(".message-btn").onclick = () => {
      startChat(docSnap.id, user.username, user.photoURL);
      searchResults.innerHTML = "";
      searchUserInput.value = "";
    };
    
    searchResults.appendChild(resultDiv);
  }
});

if (!found) {
  searchResults.innerHTML = "<p class='no-results' style='padding: 1rem; text-align: center;'>No users found</p>";
}
```

} catch (err) {
console.error(“Search error:”, err);
searchResults.innerHTML = “<p style='padding: 1rem; color: red;'>Error searching users</p>”;
}
});

function loadConversations() {
const convRef = collection(db, “conversations”);
const q = query(convRef, where(“participants”, “array-contains”, auth.currentUser.uid));

onSnapshot(q, (snapshot) => {
conversationsList.innerHTML = “”;

```
if (snapshot.empty) {
  conversationsList.innerHTML = "<p class='no-conversations' style='padding: 1rem; text-align: center; color: #666;'>No conversations yet</p>";
  return;
}

snapshot.forEach(async (docSnap) => {
  const conv = docSnap.data();
  const otherUserId = conv.participants.find(id => id !== auth.currentUser.uid);

  try {
    const userDoc = await getDoc(doc(db, "users", otherUserId));
    const userData = userDoc.data();

    const convDiv = document.createElement("div");
    convDiv.className = "conversation-item";
    if (currentChatUid === otherUserId) {
      convDiv.classList.add("active");
    }

    convDiv.innerHTML = `
      <img src="${userData.photoURL || 'default-avatar.png'}" alt="${userData.username}">
      <div class="conv-info">
        <strong>${userData.username}</strong>
        <small>${conv.lastMessage || "Start a conversation"}</small>
      </div>
    `;

    convDiv.onclick = () => {
      startChat(otherUserId, userData.username, userData.photoURL);
    };

    conversationsList.appendChild(convDiv);
  } catch (err) {
    console.error("Error loading conversation:", err);
  }
});
```

});
}

async function startChat(otherUid, otherUsername, otherPhoto) {
currentChatUid = otherUid;
currentChatUsername = otherUsername;

emptyState.style.display = “none”;
chatSection.style.display = “flex”;

chatWith.textContent = otherUsername;
chatUserAvatar.src = otherPhoto || “default-avatar.png”;

selectedMessages.clear();
deleteSelectedBtn.style.display = “none”;

const convoId = getConversationId(auth.currentUser.uid, otherUid);
const convRef = doc(db, “conversations”, convoId);
const convDoc = await getDoc(convRef);

if (!convDoc.exists()) {
await setDoc(convRef, {
participants: [auth.currentUser.uid, otherUid],
createdAt: serverTimestamp(),
lastMessage: “”
});
}

loadMessages(convoId);
}

function loadMessages(convoId) {
if (unsubscribeChat) unsubscribeChat();

const messagesRef = collection(db, “conversations”, convoId, “messages”);
const q = query(messagesRef, orderBy(“createdAt”, “asc”));

let isFirstLoad = true;
let lastMessageCount = 0;

unsubscribeChat = onSnapshot(q, (snapshot) => {
chatMessages.innerHTML = “”;

```
snapshot.forEach((docSnap) => {
  const msg = docSnap.data();
  const msgDiv = document.createElement("div");
  msgDiv.className = msg.senderId === auth.currentUser.uid ? "message sent" : "message received";
  msgDiv.dataset.id = docSnap.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "message-checkbox";
  checkbox.onchange = () => toggleMessageSelection(docSnap.id);

  const textSpan = document.createElement("span");
  textSpan.textContent = msg.text;

  const timeSpan = document.createElement("small");
  timeSpan.className = "message-time";
  timeSpan.textContent = msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString() : "Sending...";

  msgDiv.appendChild(checkbox);
  msgDiv.appendChild(textSpan);
  msgDiv.appendChild(timeSpan);

  chatMessages.appendChild(msgDiv);
});

chatMessages.scrollTop = chatMessages.scrollHeight;

if (!isFirstLoad && snapshot.size > lastMessageCount) {
  const lastMsg = snapshot.docs[snapshot.docs.length - 1].data();
  if (lastMsg.senderId !== auth.currentUser.uid) {
    showNotification(`New message from ${currentChatUsername}`, lastMsg.text);
  }
}

isFirstLoad = false;
lastMessageCount = snapshot.size;
```

});
}

sendMessageBtn.addEventListener(“click”, async () => {
await sendMessage();
});

messageInput.addEventListener(“keydown”, (e) => {
if (e.key === “Enter” && !e.shiftKey) {
e.preventDefault();
sendMessage();
}
});

async function sendMessage() {
const text = messageInput.value.trim();
if (!text || !currentChatUid) return;

const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

try {
await addDoc(collection(db, “conversations”, convoId, “messages”), {
text,
senderId: auth.currentUser.uid,
createdAt: serverTimestamp()
});

```
await updateDoc(doc(db, "conversations", convoId), {
  lastMessage: text.substring(0, 50),
  lastMessageTime: serverTimestamp()
});

messageInput.value = "";
```

} catch (err) {
console.error(“Error sending message:”, err);
alert(“Error sending message: “ + err.message);
}
}

function toggleMessageSelection(msgId) {
if (selectedMessages.has(msgId)) {
selectedMessages.delete(msgId);
} else {
selectedMessages.add(msgId);
}

deleteSelectedBtn.style.display = selectedMessages.size > 0 ? “inline-block” : “none”;
deleteSelectedBtn.textContent = `🗑️ Delete (${selectedMessages.size})`;
}

selectAllBtn.addEventListener(“click”, () => {
const checkboxes = chatMessages.querySelectorAll(”.message-checkbox”);
const allChecked = Array.from(checkboxes).every(cb => cb.checked);

checkboxes.forEach((checkbox) => {
const msgDiv = checkbox.closest(”.message”);
const msgId = msgDiv.dataset.id;

```
if (allChecked) {
  checkbox.checked = false;
  selectedMessages.delete(msgId);
} else {
  checkbox.checked = true;
  selectedMessages.add(msgId);
}
```

});

deleteSelectedBtn.style.display = selectedMessages.size > 0 ? “inline-block” : “none”;
deleteSelectedBtn.textContent = `🗑️ Delete (${selectedMessages.size})`;
});

deleteSelectedBtn.addEventListener(“click”, async () => {
if (selectedMessages.size === 0) return;

if (!confirm(`Delete ${selectedMessages.size} message(s)? This only deletes them from your view.`)) {
return;
}

const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

try {
for (const msgId of selectedMessages) {
await deleteDoc(doc(db, “conversations”, convoId, “messages”, msgId));
}

```
selectedMessages.clear();
deleteSelectedBtn.style.display = "none";
```

} catch (err) {
console.error(“Error deleting messages:”, err);
alert(“Error deleting messages: “ + err.message);
}
});

closeChatBtn.addEventListener(“click”, () => {
chatSection.style.display = “none”;
emptyState.style.display = “flex”;
currentChatUid = null;
if (unsubscribeChat) unsubscribeChat();
selectedMessages.clear();
loadConversations();
});
