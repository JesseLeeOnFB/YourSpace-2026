// messages.js – COMPLETELY FIXED - User search WILL work with profile preview

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

console.log("✅ Messages.js loaded");

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

// Navigation
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileNavBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("messagesNavBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    console.log("✅ User authenticated:", user.email);
    loadConversations();
    requestNotificationPermission();
  }
});

function requestNotificationPermission() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

async function loadConversations() {
  const userId = auth.currentUser.uid;
  const convosQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );

  onSnapshot(convosQuery, (snapshot) => {
    conversationsList.innerHTML = "";
    if (snapshot.empty) {
      conversationsList.innerHTML = "<p>No conversations yet. Search for users to start one!</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const convo = docSnap.data();
      const otherUid = convo.participants.find(uid => uid !== userId);
      const convoItem = document.createElement("div");
      convoItem.className = "convo-item";
      convoItem.dataset.uid = otherUid;
      convoItem.innerHTML = `
        <div class="convo-avatar"></div>
        <div class="convo-info">
          <h4>Loading...</h4>
          <p>${convo.lastMessage || "No messages yet"}</p>
        </div>
      `;
      conversationsList.appendChild(convoItem);

      // Load other user's info
      getDoc(doc(db, "users", otherUid)).then((userDoc) => {
        if (userDoc.exists()) {
          const u = userDoc.data();
          convoItem.querySelector(".convo-avatar").style.backgroundImage = `url(${u.photoURL || 'default-avatar.png'})`;
          convoItem.querySelector("h4").textContent = u.username || "Unknown";
        }
      });
    });

    // Add click handlers
    conversationsList.querySelectorAll(".convo-item").forEach(item => {
      item.addEventListener("click", () => openChat(item.dataset.uid));
    });
  });
}

searchUserBtn.addEventListener("click", async () => {
  const searchTerm = searchUserInput.value.trim().toLowerCase();
  if (!searchTerm) return alert("Enter a username to search!");

  try {
    const usersQuery = query(collection(db, "users"), where("usernameLower", "==", searchTerm));
    const usersSnapshot = await getDocs(usersQuery);

    searchResults.innerHTML = "";

    if (usersSnapshot.empty) {
      searchResults.innerHTML = "<p class='no-results'>No users found</p>";
      return;
    }

    usersSnapshot.forEach((docSnap) => {
      const user = docSnap.data();
      const resultItem = document.createElement("div");
      resultItem.className = "search-result-item";
      resultItem.dataset.uid = docSnap.id;
      resultItem.innerHTML = `
        <img src="${user.photoURL || 'default-avatar.png'}" class="search-avatar" alt="Avatar">
        <div class="search-info">
          <h4>${user.username}</h4>
          <p>@${user.username.toLowerCase()}</p>
        </div>
        <button class="start-chat-btn">Start Chat</button>
      `;
      searchResults.appendChild(resultItem);
    });

    // Add start chat handlers
    searchResults.querySelectorAll(".start-chat-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const uid = e.target.closest(".search-result-item").dataset.uid;
        openChat(uid);
      });
    });
  } catch (err) {
    console.error("Search error:", err);
    alert("Error searching users");
  }
});

async function openChat(otherUid) {
  if (!otherUid) return;

  currentChatUid = otherUid;

  // Load other user's info
  const otherUserDoc = await getDoc(doc(db, "users", otherUid));
  if (otherUserDoc.exists()) {
    const u = otherUserDoc.data();
    currentChatUsername = u.username;
    chatWith.textContent = u.username;
    chatUserAvatar.src = u.photoURL || "default-avatar.png";
  }

  emptyState.style.display = "none";
  chatSection.style.display = "flex";

  const convoId = getConversationId(auth.currentUser.uid, otherUid);

  // Ensure conversation doc exists
  const convoRef = doc(db, "conversations", convoId);
  await setDoc(convoRef, {
    participants: [auth.currentUser.uid, otherUid],
    lastMessageTime: serverTimestamp()
  }, { merge: true });

  // Load messages
  if (unsubscribeChat) unsubscribeChat();

  const messagesQuery = query(
    collection(db, "conversations", convoId, "messages"),
    orderBy("createdAt", "asc")
  );

  unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
    chatMessages.innerHTML = "";
    let isFirstLoad = true;
    let lastMessageCount = snapshot.size;

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgDiv = document.createElement("div");
      msgDiv.className = "message";
      msgDiv.dataset.id = docSnap.id;
      const isSent = msg.senderId === auth.currentUser.uid;
      msgDiv.classList.add(isSent ? "sent" : "received");

      const time = msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : "";

      msgDiv.innerHTML = `
        <input type="checkbox" class="message-checkbox" style="margin-right: 10px;">
        <div class="message-content">
          <p>${msg.text}</p>
          <span class="message-time">${time}</span>
        </div>
      `;

      chatMessages.appendChild(msgDiv);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Play sound for new messages
    if (!isFirstLoad && snapshot.size > lastMessageCount) {
      notificationSound.play().catch(err => console.log("Audio play error:", err));
    }

    isFirstLoad = false;
    lastMessageCount = snapshot.size;

    // Add checkbox handlers
    chatMessages.querySelectorAll(".message-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", (e) => {
        const msgDiv = e.target.closest(".message");
        const msgId = msgDiv.dataset.id;
        toggleMessageSelection(msgId);
      });
    });
  });
}

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function toggleMessageSelection(msgId) {
  if (selectedMessages.has(msgId)) {
    selectedMessages.delete(msgId);
  } else {
    selectedMessages.add(msgId);
  }

  deleteSelectedBtn.style.display = selectedMessages.size > 0 ? "inline-block" : "none";
  deleteSelectedBtn.textContent = `🗑️ Delete (${selectedMessages.size})`;
}

selectAllBtn.addEventListener("click", () => {
  const checkboxes = chatMessages.querySelectorAll(".message-checkbox");
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach((checkbox) => {
    checkbox.checked = !allChecked;
    const msgDiv = checkbox.closest(".message");
    const msgId = msgDiv.dataset.id;
    if (checkbox.checked) {
      selectedMessages.add(msgId);
    } else {
      selectedMessages.delete(msgId);
    }
  });

  deleteSelectedBtn.style.display = selectedMessages.size > 0 ? "inline-block" : "none";
  deleteSelectedBtn.textContent = `🗑️ Delete (${selectedMessages.size})`;
});

deleteSelectedBtn.addEventListener("click", async () => {
  if (selectedMessages.size === 0) return;

  if (!confirm(`Delete ${selectedMessages.size} message(s)?`)) return;

  const convoId = getConversationId(auth.currentUser.uid, currentChatUid);

  try {
    for (const msgId of selectedMessages) {
      await deleteDoc(doc(db, "conversations", convoId, "messages", msgId));
    }
    selectedMessages.clear();
    deleteSelectedBtn.style.display = "none";
  } catch (err) {
    console.error("Error deleting messages:", err);
    alert("Error: " + err.message);
  }
});

closeChatBtn.addEventListener("click", () => {
  chatSection.style.display = "none";
  emptyState.style.display = "flex";
  currentChatUid = null;
  if (unsubscribeChat) unsubscribeChat();
  selectedMessages.clear();
  deleteSelectedBtn.style.display = "none";
});

sendMessageBtn.addEventListener("click", async () => {
  await sendMessage();
});

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

    messageInput.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Error: " + err.message);
  }
}

console.log("✅ Messages.js fully initialized");