// File: feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

const postContent = document.getElementById("postContent");
const postImageURL = document.getElementById("postImageURL");
const publishBtn = document.getElementById("publishBtn");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logoutBtn");

// Logout
logoutBtn.addEventListener("click", async ()=>{ await signOut(auth); window.location.href="index.html"; });

// Check login
onAuthStateChanged(auth, async (user)=>{
  if(!user){ window.location.href="index
