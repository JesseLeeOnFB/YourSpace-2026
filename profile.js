// Profile.js - Direct Firebase connection, cache-busting included
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(app);

let currentUser;
const profilePfp = document.getElementById('profilePfp');
const pfpInput = document.getElementById('pfpInput');
const savePfpBtn = document.getElementById('savePfpBtn');
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const wallCommentsList = document.getElementById('wallCommentsList');
const wallCommentInput = document.getElementById('wallCommentInput');
const postWallCommentBtn = document.getElementById('postWallCommentBtn');

document.addEventListener('DOMContentLoaded', async () => {
  auth.onAuthStateChanged(async user => {
    if (!user) return;
    currentUser = user;
    await loadProfile();
    await loadWallComments();
  });
});

// Load Profile Info
async function loadProfile() {
  const docRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.profilePicture) profilePfp.src = data.profilePicture + '?cb=' + Date.now();
}

// Save Profile Info
saveProfileBtn.addEventListener('click', async () => {
  const docRef = doc(db, 'users', currentUser.uid);
  await setDoc(docRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });
  alert('Profile saved!');
});

// Save Profile Picture
savePfpBtn.addEventListener('click', async () => {
  if (!pfpInput.files[0]) return;
  const file = pfpInput.files[0];
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await setDoc(doc(db, 'users', currentUser.uid), { profilePicture: url }, { merge: true });
  profilePfp.src = url + '?cb=' + Date.now();
});

// Wall Comments
async function loadWallComments() {
  wallCommentsList.innerHTML = '';
  const commentsCol = collection(db, 'users', currentUser.uid, 'wallComments');
  const commentsSnap = await getDocs(commentsCol);
  commentsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.textContent = `${data.text || ''}`;
    if (currentUser.uid === data.authorId || currentUser.uid === currentUser.uid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'wallComments', docSnap.id));
        loadWallComments();
      });
      div.appendChild(delBtn);
    }
    wallCommentsList.appendChild(div);
  });
}

// Post Comment
postWallCommentBtn.addEventListener('click', async () => {
  if (!wallCommentInput.value) return;
  const commentsCol = collection(db, 'users', currentUser.uid, 'wallComments');
  await addDoc(commentsCol, {
    text: wallCommentInput.value,
    authorId: currentUser.uid,
    timestamp: Date.now()
  });
  wallCommentInput.value = '';
  loadWallComments();
});
