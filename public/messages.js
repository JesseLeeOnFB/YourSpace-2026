// messages.js – Using Firebase Compat SDK
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentChatUid = null;
let currentChatUsername = null;
let unsubscribeChat = null;
let selectedMessages = new Set();

console.log("✅ Messages.js loaded");

// Navigation
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileNavBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("messagesNavBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("dashboardNavBtn").onclick = () => window.location.href = "dashboard.html";
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  window.location.href = "login.html";
};

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) {
  hamburger.onclick = () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  };
}

// Auth check
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    console.log("✅ User authenticated:", user.email);
    loadConversations();
    requestNotificationPermission();
  }
});

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// ═══════════════════════════════════════════════════════════
// LOAD CONVERSATIONS
// ═══════════════════════════════════════════════════════════
async function loadConversations() {
  const userId = auth.currentUser.uid;
  const conversationsList = document.getElementById("conversationsList");
  
  db.collection("conversations")
    .where("participants", "array-contains", userId)
    .orderBy("lastMessageTime", "desc")
    .onSnapshot((snapshot) => {
      conversationsList.innerHTML = "";
      
      if (snapshot.empty) {
        conversationsList.innerHTML = "<p>No conversations yet. Search for users to start one!</p>";
        return;
      }

      snapshot.forEach(async (docSnap) => {
        const convo = docSnap.data();
        const otherUid = convo.participants.find(uid => uid !== userId);
        
        const convoItem = document.createElement("div");
        convoItem.className = "convo-item";
        convoItem.dataset.uid = otherUid;
        convoItem.innerHTML = `
          <div class="convo-avatar" style="background-image: url('default-avatar.png');"></div>
          <div class="convo-info">
            <h4>Loading...</h4>
            <p>${convo.lastMessage || "No messages yet"}</p>
          </div>
        `;
        conversationsList.appendChild(convoItem);

        // Load other user's info
        const userDoc = await db.collection('users').doc(otherUid).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          convoItem.querySelector(".convo-avatar").style.backgroundImage = `url(${u.photoURL || 'default-avatar.png'})`;
          convoItem.querySelector("h4").textContent = u.username || "Unknown";
        }
        
        // Click handler
        convoItem.onclick = () => openChat(otherUid);
      });
    });
}

// ═══════════════════════════════════════════════════════════
// SEARCH USERS
// ═══════════════════════════════════════════════════════════
const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

searchUserBtn.addEventListener("click", async () => {
  const searchTerm = searchUserInput.value.trim().toLowerCase();
  
  if (!searchTerm) {
    return alert("Enter a username to search!");
  }

  try {
    console.log("Searching for:", searchTerm);
    
    // Try exact match first
    let usersSnapshot = await db.collection("users")
      .where("usernameLower", "==", searchTerm)
      .get();

    // If no exact match, try fuzzy search
    if (usersSnapshot.empty) {
      console.log("No exact match - trying fuzzy search");
      usersSnapshot = await db.collection("users")
        .orderBy("usernameLower")
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff')
        .limit(10)
        .get();
    }

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
          <h4>${user.username || 'Unknown'}</h4>
          <p>@${(user.username || '').toLowerCase()}</p>
        </div>
        <button class="start-chat-btn">Start Chat</button>
      `;
      searchResults.appendChild(resultItem);
    });

    // Add click handlers
    searchResults.querySelectorAll(".start-chat-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const uid = e.target.closest(".search-result-item").dataset.uid;
        openChat(uid);
      });
    });
    
  } catch (err) {
    console.error("Search error:", err);
    alert("Error searching users: " + err.message);
  }
});

// ═══════════════════════════════════════════════════════════
// OPEN CHAT
// ═══════════════════════════════════════════════════════════
async function openChat(otherUid) {
  if (!otherUid) return;

  currentChatUid = otherUid;
  
  const emptyState = document.getElementById("emptyState");
  const chatSection = document.getElementById("chatSection");
  const chatWith = document.getElementById("chatWith");
  const chatUserAvatar = document.getElementById("chatUserAvatar");
  const chatMessages = document.getElementById("chatMessages");

  // Load other user's info
  const otherUserDoc = await db.collection('users').doc(otherUid).get();
  if (otherUserDoc.exists) {
    const u = otherUserDoc.data();
    currentChatUsername = u.username;
    chatWith.textContent = u.username;
    chatUserAvatar.src = u.photoURL || "default-avatar.png";
  }

  emptyState.style.display = "none";
  chatSection.style.display = "flex";

  const convoId = getConversationId(auth.currentUser.uid, otherUid);

  // Ensure conversation doc exists
  const convoRef = db.collection("conversations").doc(convoId);
  await convoRef.set({
    participants: [auth.currentUser.uid, otherUid],
    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Load messages
  if (unsubscribeChat) unsubscribeChat();

  unsubscribeChat = db.collection("conversations")
    .doc(convoId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      chatMessages.innerHTML = "";

      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const msgDiv = document.createElement("div");
        msgDiv.className = "message";
        msgDiv.dataset.id = docSnap.id;
        
        const isSent = msg.senderId === auth.currentUser.uid;
        msgDiv.classList.add(isSent ? "sent" : "received");

        const time = msg.createdAt 
          ? new Date(msg.createdAt.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) 
          : "";

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

// ═══════════════════════════════════════════════════════════
// MESSAGE SELECTION & DELETION
// ═══════════════════════════════════════════════════════════
const selectAllBtn = document.getElementById("selectAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

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
  const chatMessages = document.getElementById("chatMessages");
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
    const batch = db.batch();
    selectedMessages.forEach(msgId => {
      const msgRef = db.collection("conversations").doc(convoId).collection("messages").doc(msgId);
      batch.delete(msgRef);
    });
    await batch.commit();
    
    selectedMessages.clear();
    deleteSelectedBtn.style.display = "none";
  } catch (err) {
    console.error("Error deleting messages:", err);
    alert("Error: " + err.message);
  }
});

// ═══════════════════════════════════════════════════════════
// CLOSE CHAT
// ═══════════════════════════════════════════════════════════
const closeChatBtn = document.getElementById("closeChatBtn");
closeChatBtn.addEventListener("click", () => {
  document.getElementById("chatSection").style.display = "none";
  document.getElementById("emptyState").style.display = "flex";
  currentChatUid = null;
  if (unsubscribeChat) unsubscribeChat();
  selectedMessages.clear();
  deleteSelectedBtn.style.display = "none";
});

// ═══════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

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
    await db.collection("conversations").doc(convoId).collection("messages").add({
      text: text,
      senderId: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("conversations").doc(convoId).update({
      lastMessage: text.substring(0, 50),
      lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Error: " + err.message);
  }
}

console.log("✅ Messages.js fully initialized");