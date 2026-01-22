import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Firebase config
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

// Universal navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => window.location.href="feed.html");
document.getElementById("profileNavBtn")?.addEventListener("click", () => window.location.href="profile.html");
document.getElementById("messagesNavBtn")?.addEventListener("click", () => window.location.href="messages.html");
document.getElementById("dashboardNavBtn")?.addEventListener("click", () => window.location.href="dashboard.html");
document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href="login.html"; });

// Hamburger menu
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if(hamburger && navLinks){
  hamburger.addEventListener("click",()=>{hamburger.classList.toggle("active");navLinks.classList.toggle("active");});
  navLinks.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{hamburger.classList.remove("active");navLinks.classList.remove("active");}));
}

// Load messages
onAuthStateChanged(auth, async (user)=>{
  if(!user){ window.location.href="login.html"; return; }

  const messagesList = document.getElementById("messagesList");
  messagesList.innerHTML = "";

  const messagesRef = collection(db,"messages");
  const q = query(messagesRef, where("to","==",user.uid), orderBy("timestamp","desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap=>{
    const msg = docSnap.data();
    const card = document.createElement("div");
    card.className = "message-card" + (msg.read ? "" : " unread");

    card.innerHTML = `
      <div class="message-header">
        <span>From: ${msg.fromName}</span>
        <span>${new Date(msg.timestamp?.toMillis ? msg.timestamp.toMillis() : msg.timestamp).toLocaleString()}</span>
      </div>
      <div class="message-body">${msg.text}</div>
      <div class="message-actions">
        <button class="replyBtn">Reply</button>
        <button class="deleteBtn">Delete</button>
        <button class="markReadBtn">${msg.read ? "Mark Unread" : "Mark Read"}</button>
      </div>
    `;
    // Action handlers
    card.querySelector(".replyBtn").addEventListener("click",()=>alert("Reply feature coming soon"));
    card.querySelector(".deleteBtn").addEventListener("click",()=>alert("Delete feature coming soon"));
    card.querySelector(".markReadBtn").addEventListener("click",()=>{
      alert("Toggle Read/Unread feature coming soon");
    });

    messagesList.appendChild(card);
  });
});
