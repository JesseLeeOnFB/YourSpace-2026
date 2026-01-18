import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// DOM
const searchInput = document.getElementById("searchUserInput");
const searchResults = document.getElementById("searchResults");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// Navigation
document.getElementById("navFeed").onclick = ()=>window.location.href="feed.html";
document.getElementById("navProfile").onclick = ()=>window.location.href="profile.html";
document.getElementById("navMessages").onclick = ()=>window.location.href="messages.html";
document.getElementById("navLogout").onclick = ()=>signOut(auth).then(()=>window.location.href="login.html");

// State
let currentUser=null;
let activeConversationId=null;

// Auth
onAuthStateChanged(auth, async user=>{
  if(!user) return window.location.replace("login.html");
  currentUser=user;
});

// Search Users
searchInput.addEventListener("input", async()=>{
  searchResults.innerHTML="";
  const q = query(collection(db,"users"), where("username","!=",null));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    if(data.username.toLowerCase().includes(searchInput.value.toLowerCase()) && docSnap.id!==currentUser.uid){
      const div=document.createElement("div");
      div.textContent = data.username;
      div.onclick=()=>selectUser(docSnap.id,data.username);
      searchResults.appendChild(div);
    }
  });
});

async function selectUser(userId, username){
  chatHeader.textContent=username;
  activeConversationId=[currentUser.uid,userId].sort().join("_");
  await setDoc(doc(db,"messages",activeConversationId),{participants:[currentUser.uid,userId]},{merge:true});
  loadMessages();
}

// Send Message
sendBtn.addEventListener("click", async()=>{
  if(!chatInput.value.trim() || !activeConversationId) return;
  await addDoc(collection(db,"messages",activeConversationId,"messages"),{
    text: chatInput.value.trim(),
    userId: currentUser.uid,
    createdAt: new Date()
  });
  chatInput.value="";
  loadMessages();
});

// Load Messages
async function loadMessages(){
  chatMessages.innerHTML="";
  if(!activeConversationId) return;
  const q = query(collection(db,"messages",activeConversationId,"messages"), orderBy("createdAt","asc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    const div = document.createElement("div");
    div.textContent = `${data.userId}: ${data.text}`;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
