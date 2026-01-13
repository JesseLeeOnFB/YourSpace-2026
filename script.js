import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const welcomeDiv = document.getElementById('welcome');
const usernameDisplay = document.getElementById('username-display');
const profileSection = document.getElementById('profile-section');
const createPostSection = document.getElementById('create-post-section');
const postsContainer = document.getElementById('posts-container');

const usernameInput = document.getElementById('username-input');
const bgInput = document.getElementById('bg-input');
const musicInput = document.getElementById('music-input');
const saveProfileBtn = document.getElementById('save-profile-btn');

const postTitle = document.getElementById('post-title');
const postContent = document.getElementById('post-content');
const postImage = document.getElementById('post-image');
const postMusic = document.getElementById('post-music');
const createPostBtn = document.getElementById('create-post-btn');

// Sign Up
signupBtn.addEventListener('click', () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => alert("Account created!"))
    .catch(err => alert(err.message));
});

// Login
loginBtn.addEventListener('click', () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => console.log("Logged in!"))
    .catch(err => alert(err.message));
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => location.reload());
});

// Auth state observer
onAuthStateChanged(auth, user => {
  if(user){
    loginBtn.classList.add('hidden');
    signupBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    welcomeDiv.classList.remove('hidden');
    profileSection.classList.remove('hidden');
    createPostSection.classList.remove('hidden');

    usernameDisplay.textContent = user.displayName || user.email;

    // Load posts
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      postsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.innerHTML = `
          <strong>${data.username}</strong><br>
          <em>${data.title}</em><p>${data.content}</p>
          ${data.image ? `<img src="${data.image}">` : ''}
          ${data.music ? `<audio controls src="${data.music}"></audio>` : ''}
          <button class="delete-btn">Delete</button>
        `;
        const deleteBtn = postDiv.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        });
        postsContainer.appendChild(postDiv);
      });
    });
  } else {
    loginBtn.classList.remove('hidden');
    signupBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    welcomeDiv.classList.add('hidden');
    profileSection.classList.add('hidden');
    createPostSection.classList.add('hidden');
  }
});

// Save profile
saveProfileBtn.addEventListener('click', () => {
  const user = auth.currentUser;
  if(user){
    updateDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      background: bgInput.value,
      music: musicInput.value
    }).then(() => alert("Profile saved!"));
    // Apply background immediately
    document.body.style.background = bgInput.value || "linear-gradient(#1a1a1a, #0d0d0d)";
  }
});

// Create post
createPostBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if(user){
    await addDoc(collection(db, "posts"), {
      username: usernameInput.value || user.email,
      title: postTitle.value,
      content: postContent.value,
      image: postImage.value,
      music: postMusic.value,
      timestamp: new Date()
    });
    postTitle.value = "";
    postContent.value = "";
    postImage.value = "";
    postMusic.value = "";
  }
});

