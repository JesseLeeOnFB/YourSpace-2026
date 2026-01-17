import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase Config
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
const conversationsContainer = document.getElementById("conversationsContainer");
const messagesContainer = document.getElementById("messagesContainer");
const chatTitle = document.getElementById("chatTitle");
const messageInput = document.getElementById("messageInput");
const messageFileInput = document.getElementById("messageFileInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const navFeed = document.getElementById("navFeed");
const navProfile = document.getElementById("navProfile");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// State
// ---------------------
let currentUser = null;
let currentConvId = null;

// ---------------------
// Auth
// ---------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  currentUser = user;
  loadConversations();
});

// ---------------------
// Navigation
// ---------------------
navFeed?.addEventListener("click", () => window.location.href = "feed.html");
navProfile?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Load Conversations
// ---------------------
async function loadConversations() {
  conversationsContainer.innerHTML = "";
  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.userIds.includes(currentUser.uid)) return;

    const otherUid = data.userIds.find(uid => uid !== currentUser.uid);
    const convDiv = document.createElement("div");
    convDiv.className = "conversation";
    convDiv.textContent = `Conversation with ${otherUid}`;
    convDiv.style.cursor = "pointer";
    convDiv.addEventListener("click", () => openConversation(docSnap.id, otherUid));
    conversationsContainer.appendChild(convDiv);
  });
}

// ---------------------
// Open Conversation
// ---------------------
function openConversation(convId, otherUid) {
  currentConvId = convId;
  chatTitle.textContent = `Chat with ${otherUid}`;
  messagesContainer.innerHTML = "";

  const messagesRef = collection(db, "messages", convId, "messages");
  const q = query(messagesRef, orderBy("createdAt"));
  
  onSnapshot(q, (snap) => {
    messagesContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const msg = docSnap.data();
      const msgDiv = document.createElement("div");
      msgDiv.className = "message";
      if (msg.userId === currentUser.uid) msgDiv.classList.add("self");

      let content = msg.text || "";
      if (msg.mediaURL) {
        if (msg.mediaType === "image") {
          content += `<br><img src="${msg.mediaURL}" style="max-width:200px;">`;
        } else if (msg.mediaType === "video") {
          content += `<br><video controls style="max-width:200px;"><source src="${msg.mediaURL}"></video>`;
        }
      }

      msgDiv.innerHTML = `<strong>${msg.username}:</strong> ${content}`;
      messagesContainer.appendChild(msgDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  });
}

// ---------------------
// Send Message
// ---------------------
sendMessageBtn?.addEventListener("click", async () => {
  if (!messageInput.value.trim() && !messageFileInput.files[0]) return;

  let mediaURL = "";
  let mediaType = "";

  if (messageFileInput.files[0]) {
    const file = messageFileInput.files[0];
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const storageRef = ref(storage, `messages/${currentConvId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "User";

  await addDoc(collection(db, "messages", currentConvId, "messages"), {
    text: messageInput.value.trim(),
    userId: currentUser.uid,
    username,
    mediaURL,
    mediaType,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  messageFileInput.value = "";
});
