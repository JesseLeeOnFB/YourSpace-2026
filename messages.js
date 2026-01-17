import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --------------------
// Firebase Init
// --------------------
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

// --------------------
// DOM Elements
// --------------------
const navFeed = document.getElementById("navFeed");
const navProfile = document.getElementById("navProfile");
const logoutBtn = document.getElementById("logoutBtn");

const conversationsContainer = document.getElementById("conversationsContainer");
const conversationsList = document.getElementById("conversationsList");

const chatContainer = document.getElementById("chatContainer");
const chatWithEl = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const messageFileInput = document.getElementById("messageFileInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const backToConversations = document.getElementById("backToConversations");

// --------------------
// State
// --------------------
let currentUser = null;
let activeConversationId = null;

// --------------------
// Auth
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadConversations();

  // If URL has convId, open chat directly
  const urlParams = new URLSearchParams(window.location.search);
  const convId = urlParams.get("convId");
  if (convId) openConversation(convId);
});

// --------------------
// Navigation
// --------------------
navFeed.onclick = () => window.location.href = "feed.html";
navProfile.onclick = () => window.location.href = "profile.html";
logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

// --------------------
// Load Conversations
// --------------------
async function loadConversations() {
  conversationsList.innerHTML = "";
  const q = query(
    collection(db, "messages"),
    where("userIds", "array-contains", currentUser.uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const otherUserId = data.userIds.find(id => id !== currentUser.uid);
    const div = document.createElement("div");
    div.className = "conversation";
    div.textContent = `Conversation with ${otherUserId}`;
    div.onclick = () => openConversation(docSnap.id);
    conversationsList.appendChild(div);
  });
}

// --------------------
// Open Conversation
// --------------------
async function openConversation(convId) {
  activeConversationId = convId;
  conversationsContainer.style.display = "none";
  chatContainer.style.display = "block";

  messagesContainer.innerHTML = "";
  const convDoc = doc(db, "messages", convId);
  const msgsSnap = await getDocs(
    query(collection(convDoc, "messages"), orderBy("createdAt", "asc"))
  );
  msgsSnap.forEach(docSnap => {
    displayMessage(docSnap.data());
  });
}

// --------------------
// Display Message
// --------------------
function displayMessage(data) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `<span class="sender">${data.username}</span>: ${data.text || ""}`;

  if (data.mediaURL) {
    if (data.mediaType === "image") {
      const img = document.createElement("img");
      img.src = data.mediaURL;
      div.appendChild(img);
    } else if (data.mediaType === "video") {
      const vid = document.createElement("video");
      vid.controls = true;
      vid.src = data.mediaURL;
      div.appendChild(vid);
    }
  }
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --------------------
// Send Message
// --------------------
sendMessageBtn.onclick = async () => {
  if (!messageInput.value.trim() && !messageFileInput.files[0]) return;

  let mediaURL = "";
  let mediaType = "";

  const file = messageFileInput.files[0];
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const fileRef = ref(storage, `messages/${activeConversationId}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    mediaURL = await getDownloadURL(fileRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "User";

  await addDoc(collection(db, "messages", activeConversationId, "messages"), {
    text: messageInput.value.trim(),
    userId: currentUser.uid,
    username,
    mediaURL,
    mediaType,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  messageFileInput.value = "";
  openConversation(activeConversationId);
};

// --------------------
// Back to Conversations
// --------------------
backToConversations.onclick = () => {
  chatContainer.style.display = "none";
  conversationsContainer.style.display = "block";
};
