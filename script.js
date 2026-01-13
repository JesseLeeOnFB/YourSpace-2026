console.log("🔥 script.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// 🎯 Get DOM elements
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ====== DOM Elements ======
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');

const usernameInput = document.getElementById('username');
const themeInput = document.getElementById('theme-css');
const musicInput = document.getElementById('music-url');
const saveProfileBtn = document.getElementById('save-profile-btn');

const postTitleInput = document.getElementById('post-title');
const postTextInput = document.getElementById('post-text');
const postImageInput = document.getElementById('post-image');
const postAudioInput = document.getElementById('post-audio');
const createPostBtn = document.getElementById('create-post-btn');
const feedDiv = document.getElementById('feed');

// ====== AUTH ======
signupBtn.addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => {
        initApp(userCredential.user.uid);
    })
    .catch(err => alert(err.message));
});

loginBtn.addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => {
        initApp(userCredential.user.uid);
    })
    .catch(err => alert(err.message));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});

// ====== INITIALIZE APP ======
function initApp(uid) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    welcomeMsg.textContent = `Welcome, ${emailInput.value}`;
}

// ====== PROFILE ======
saveProfileBtn.addEventListener('click', async () => {
    const profileRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(profileRef, {
        username: usernameInput.value,
        theme: themeInput.value,
        music: musicInput.value
    }, { merge: true });
    alert('Profile saved!');
});

// ====== POSTS ======
createPostBtn.addEventListener('click', async () => {
    await addDoc(collection(db, 'posts'), {
        uid: auth.currentUser.uid,
        title: postTitleInput.value,
        text: postTextInput.value,
        image: postImageInput.value,
        audio: postAudioInput.value,
        timestamp: Date.now()
    });
    alert('Post created!');
    loadPosts();
});

async function loadPosts() {
    feedDiv.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, 'posts'));
    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const postEl = document.createElement('div');
        postEl.classList.add('post');
        postEl.innerHTML = `
            <h4>${data.title}</h4>
            <p>${data.text}</p>
            ${data.image ? `<img src="${data.image}" style="max-width:100%;">` : ''}
            ${data.audio ? `<audio controls src="${data.audio}"></audio>` : ''}
        `;
        feedDiv.appendChild(postEl);
    });
}

// Auto-load posts every 5s for demo
setInterval(loadPosts, 5000);




