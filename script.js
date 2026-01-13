import { auth, db } from './index.html'; // Already initialized globally

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
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

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authMsg = document.getElementById('auth-msg');
const userEmailSpan = document.getElementById('user-email');

const profileName = document.getElementById('profile-name');
const profileTheme = document.getElementById('profile-theme');
const profileMusic = document.getElementById('profile-music');
const saveProfileBtn = document.getElementById('save-profile');

const postText = document.getElementById('post-text');
const postImage = document.getElementById('post-image');
const postBtn = document.getElementById('post-btn');

const feed = document.getElementById('feed');

// ========== AUTH ==========
signupBtn.addEventListener('click', () => {
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(() => { authMsg.textContent = "Account created!"; })
    .catch(err => { authMsg.textContent = err.message; });
});

loginBtn.addEventListener('click', () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(() => { authMsg.textContent = "Logged in!"; })
    .catch(err => { authMsg.textContent = err.message; });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => { location.reload(); });
});

// Show/hide sections based on auth
onAuthStateChanged(auth, user => {
  if (user) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    userEmailSpan.textContent = user.email;
  } else {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
});

// ========== PROFILE ==========
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    displayName: profileName.value || "",
    theme: profileTheme.value || "",
    music: profileMusic.value || ""
  }).catch(async () => {
    await addDoc(collection(db, 'users'), {
      uid: user.uid,
      displayName: profileName.value || "",
      theme: profileTheme.value || "",
      music: profileMusic.value || ""
    });
  });
});

// ========== POSTS ==========
postBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, 'posts'), {
    userId: user.uid,
    text: postText.value,
    image: postImage.value || "",
    likes: [],
    timestamp: Date.now()
  });

  postText.value = "";
  postImage.value = "";
});

// ========== FEED ==========
const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
onSnapshot(postsQuery, snapshot => {
  feed.innerHTML = "";
  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postEl = document.createElement('div');
    postEl.classList.add('feed-post');

    const userEl = document.createElement('p');
    userEl.textContent = `User: ${post.userId}`;
    postEl.appendChild(userEl);

    const textEl = document.createElement('p');
    textEl.textContent = post.text;
    postEl.appendChild(textEl);

    if (post.image) {
      const imgEl = document.createElement('img');
      imgEl.src = post.image;
      imgEl.style.maxWidth = "100%";
      postEl.appendChild(imgEl);
    }

    // Likes button
    const likeBtn = document.createElement('button');
    likeBtn.textContent = `Like (${post.likes.length || 0})`;
    likeBtn.addEventListener('click', async () => {
      const postRef = doc(db, 'posts', docSnap.id);
      await updateDoc(postRef, { likes: arrayUnion(auth.currentUser.uid) });
    });
    postEl.appendChild(likeBtn);

    feed.appendChild(postEl);
  });
});

