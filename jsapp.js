// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// app.js continued
import { auth, db, storage } from './firebaseConfig.js'; // adjust path

// Auth
document.getElementById('signup-btn').addEventListener('click', async ()=>{
  const email = document.getElementById('signup-email').value;
  const pass = document.getElementById('signup-pass').value;
  await createUserWithEmailAndPassword(auth, email, pass);
  alert('Account created! Log in now.');
});

document.getElementById('login-btn').addEventListener('click', async ()=>{
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  await signInWithEmailAndPassword(auth, email, pass);
  document.getElementById('login-signup').style.display = 'none';
  document.getElementById('feed').style.display = 'block';
});

// Posts
document.getElementById('create-post-btn').addEventListener('click', async ()=>{
  const text = document.getElementById('post-text').value;
  const music = document.getElementById('post-music').value;
  const imageFile = document.getElementById('post-image').files[0];
  let imageUrl = '';

  if(imageFile){
    const imageRef = ref(storage, 'posts/' + imageFile.name);
    await uploadBytes(imageRef, imageFile);
    imageUrl = await getDownloadURL(imageRef);
  }

  await addDoc(collection(db, 'posts'), { text, music, imageUrl, likes:0, timestamp: Date.now() });
  document.getElementById('post-text').value = '';
  document.getElementById('post-music').value = '';
  document.getElementById('post-image').value = '';
  alert('Post created!');
});

// TODO: load posts, likes, comments, trending post highlight, friend system, analytics
