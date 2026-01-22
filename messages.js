// messages.js - COMPLETE WORKING VERSION

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

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

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
const hamburger = document.getElementById(“hamburger”);
const navLinks = document.getElementById(“navLinks”);

// Navigation
document.getElementById(“feedNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “feed.html”;
});

document.getElementById(“profileNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “profile.html”;
});

document.getElementById(“messagesNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “messages.html”;
});

document.getElementById(“notificationsNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “notifications.html”;
});

document.getElementById(“dashboardNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “dashboard.html”;
});

document.getElementById(“adminNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “admin.html”;
});

document.getElementById(“contactNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “contact.html”;
});

document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

// Hamburger menu
if (hamburger && navLinks) {
hamburger.addEventListener(“click”, () => {
hamburger.classList.toggle(“active”);
navLinks.classList.toggle(“active”);
});

navLinks.querySelectorAll(“button”).forEach(button => {
button.addEventListener(“click”, () => {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
});
});

document.addEventListener(“click”, (e) => {
if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
}
});
}

// Auth
onAuthStateChanged(auth, (user) => {
if (!user) {
window.location.href = “login.html”;
} else {
if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
document.getElementById(“adminNavBtn”).style.display = “inline-block”;
}
console.log(“User authenticated:”, user.email);
loadConversations();
}
});

function getConversationId(uid1, uid2) {
return [uid1, uid2].sort().join(”_”);
}

// FIXED SEARCH - WORKS NOW
searchUserBtn.addEventListener(“click”, async () => {
console.log(“🔍 Search clicked”);

const searchTerm = searchUserInput.value.trim().toLowerCase();
console.log(“Search term:”, searchTerm);

if (!searchTerm) {
alert(“Please enter a username”);
return;
}

searchResults.innerHTML = “<p style='padding:1rem;text-align:center;color:#00ff00;'>🔍 Searching…</p>”;

try {
const usersRef = collection(db, “users”);
console.log(“Fetching users…”);

```
const snapshot = await getDocs(usersRef);
console.log("Total users found:", snapshot.size);

searchResults.innerHTML = "";
let found = false;

snapshot.forEach((docSnap) => {
  const user = docSnap.data();
  const username = (user.username || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  
  if (docSnap.id === auth.currentUser.uid) return;
  
  if (username.includes(searchTerm) || email.includes(searchTerm)) {
    console.log("✅ Match:", user.username);
    found = true;
    
    const resultDiv = document.createElement("div");
    resultDiv.className = "search-result";
    resultDiv.innerHTML = `
      <img src="${user.photoURL || 'https://via.placeholder.com/50'}" alt="${user.username}">
      <div class="result-info">
        <strong>${user.username || user.email}</strong>
        <small>@${user.username || user.email.split('@')[0]}</small>
      </div>
      <button class="message-btn">💬 Message</button>
    `;
    
    resultDiv.querySelector(".message-btn").onclick = () => {
      console.log("Starting chat with:", user.username);
      startChat(docSnap.id, user.username || user.email, user.photoURL);
      searchResults.innerHTML = "";
      searchUserInput.value = "";
    };
    
    searchResults.appendChild(resultDiv);
  }
});

if (!found) {
  console.log("❌ No matches");
  searchResults.innerHTML = `
    <p style='padding:2rem;text-align:center;color:#999;'>
      No users found matching "${searchTerm}"<br>
      <small>Try searching by username or email</small>
    </p>
  `;
}
```

} catch (err) {
console.error(“❌ Search error:”, err);
searchResults.innerHTML = `<p style='padding:1rem;color:red;text-align:center;'>Error: ${err.message}</p>`;
}
});

// Enter key search
searchUserInput.addEventListener(“keydown”, (e) => {
if (e.key === “Enter”) {
searchUserBtn.click();
}
});

// Load conversations
function loadConversations() {
const convRef = collection(db, “conversations”);
const q = query(convRef, where(“participants”, “array-contains”, auth.currentUser.uid));

onSnapshot(q, (snapshot) => {
conversationsList.innerHTML = “”;

```
if (snapshot.empty) {
  conversationsList.innerHTML = "<p style='padding:1rem;text-align:center;color:#666;'>No conversations yet</p>";
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
    if (currentChatUid === otherUserId) convDiv.classList.add("active");

    convDiv.innerHTML = `
      <img src="${userData.photoURL || 'https://via.placeholder.com/50'}" alt="${userData.username}">
      <div class="conv-info">
        <strong>${userData.username}</strong>
        <small>${conv.lastMessage || "Start a conversation"}</small>
      </div>
    `;

    convDiv.onclick = () => startChat(otherUserId, userData.username, userData.photoURL);
    conversationsList.appendChild(convDiv);
  } catch (err) {
    console.error("Error loading conversation:", err);
  }
});
```

});
}

// Start chat
async function startChat(otherUid, otherUsername, otherPhoto) {
currentChatUid = otherUid;
currentChatUsername = otherUsername;

emptyState.style.display = “none”;
chatSection.style.display = “flex”;

chatWith.textContent = otherUsername;
chatUserAvatar.src = otherPhoto || “https://via.placeholder.com/50”;

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

// Load messages
function loadMessages(convoId) {
if (unsubscribeChat) unsubscribeChat();

const messagesRef = collection(db, “conversations”, convoId, “messages”);
const q = query(messagesRef, orderBy(“createdAt”, “asc”));

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
```

});
}

// Send message
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
console.error(“Error sending:”, err);
alert(“Error: “ + err.message);
}
}

// Message selection
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
if (!confirm(`Delete ${selectedMessages.size} message(s)?`)) return;

const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

try {
for (const msgId of selectedMessages) {
await deleteDoc(doc(db, “conversations”, convoId, “messages”, msgId));
}
selectedMessages.clear();
deleteSelectedBtn.style.display = “none”;
} catch (err) {
console.error(“Error deleting:”, err);
alert(“Error: “ + err.message);
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
