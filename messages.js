import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, getDocs, query, orderBy, serverTimestamp, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// -------------------- Firebase Init --------------------
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

// -------------------- DOM --------------------
const conversationsContainer = document.getElementById("conversationsContainer");
const messageSection = document.getElementById("messageSection");
const chatWithEl = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const messageFileInput = document.getElementById("messageFileInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const backToConversationsBtn = document.getElementById("backToConversationsBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// -------------------- State --------------------
let currentUser = null;
let activeConversationId = null;
let activeConversationUser = null;

// -------------------- Auth --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadConversations();
});

// -------------------- Navigation --------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// -------------------- Conversations --------------------
async function loadConversations() {
  conversationsContainer.innerHTML = "";
  const q = query(collection(db, "privateMessages"));
  const snap = await getDocs(q);

  snap.forEach(async docSnap => {
    const data = docSnap.data();
    if (!data.participants.includes(currentUser.uid)) return;

    // Show the other participant
    const otherUserId = data.participants.find(uid => uid !== currentUser.uid);
    const userSnap = await getDoc(doc(db, "users", otherUserId));
    const username = userSnap.data()?.username || "User";

    const div = document.createElement("div");
    div.className = "conversation-item";
    div.innerHTML = `<button>${username}</button>`;
    div.querySelector("button").addEventListener("click", () => openConversation(docSnap.id, otherUserId, username));
    conversationsContainer.appendChild(div);
  });
}

// -------------------- Open Conversation --------------------
async function openConversation(conversationId, otherUserId, username) {
  activeConversationId = conversationId;
  activeConversationUser = otherUserId;
  chatWithEl.textContent = `Chat with ${username}`;
  conversationsContainer.style.display = "none";
  messageSection.style.display = "block";
  messagesContainer.innerHTML = "";
  await loadMessages();
}

// -------------------- Back to Conversations --------------------
backToConversationsBtn.addEventListener("click", () => {
  activeConversationId = null;
  activeConversationUser = null;
  messageSection.style.display = "none";
  conversationsContainer.style.display = "block";
  messagesContainer.innerHTML = "";
});

// -------------------- Load Messages --------------------
async function loadMessages() {
  messagesContainer.innerHTML = "";
  if (!activeConversationId) return;

  const q = query(
    collection(db, "privateMessages", activeConversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = data.senderId === currentUser.uid ? "message-sent" : "message-received";
    div.innerHTML = `<strong>${data.username}</strong>: ${data.text || ""}`;
    if (data.mediaURL) {
      const ext = data.mediaType;
      if (ext === "image") {
        div.innerHTML += `<br><img src="${data.mediaURL}" style="max-width:200px;">`;
      } else if (ext === "video") {
        div.innerHTML += `<br><video controls style="max-width:250px;"><source src="${data.mediaURL}"></video>`;
      }
    }
    messagesContainer.appendChild(div);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// -------------------- Send Message --------------------
sendMessageBtn.addEventListener("click", async () => {
  if (!activeConversationId || (!messageInput.value.trim() && !messageFileInput.files[0])) return;

  let mediaURL = "";
  let mediaType = "";

  const file = messageFileInput.files[0];
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const storageRef = ref(storage, `privateMessages/${activeConversationId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "User";

  await addDoc(collection(db, "privateMessages", activeConversationId, "messages"), {
    senderId: currentUser.uid,
    username,
    text: messageInput.value.trim(),
    mediaURL,
    mediaType,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  messageFileInput.value = "";
  await loadMessages();
});
