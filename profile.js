import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM elements
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profilePfp = document.getElementById('profilePfp');
const profilePfpInput = document.getElementById('profilePfpInput');
const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');
const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const themesDropdown = document.getElementById('themesDropdown');
const musicPlayerContainer = document.getElementById('musicPlayerContainer');
const musicUrlInput = document.getElementById('musicUrlInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');

// Helpers
async function loadProfileData(user) {
  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Load wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfileData(user);
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends dummy
  top10FriendsContainer.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const friendDiv = document.createElement('div');
    friendDiv.className = 'top-friend';
    friendDiv.innerHTML = `<span>${i}. Friend ${i}</span>`;
    top10FriendsContainer.appendChild(friendDiv);
  }
}

// Event listeners
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, "users", user.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved!");
});

saveProfilePfpBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select a profile picture first");
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = url;
  await updateDoc(doc(db, "users", user.uid), { pfpURL: url });
  alert("Profile picture updated!");
});

addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const comment = {
    text: wallCommentInput.value,
    username: usernameInput.value || 'Unknown',
    userId: user.uid,
    timestamp: Date.now()
  };
  await updateDoc(doc(db, "users", user.uid), { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfileData(user);
});

themesDropdown.addEventListener('change', () => {
  document.body.className = themesDropdown.value;
});

loadMusicBtn.addEventListener('click', () => {
  const url = musicUrlInput.value.trim();
  if (!url) return;
  // Convert to embed logic here (placeholder)
  musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="${url}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
});

// Init
onAuthStateChanged(auth, user => {
  if (user) loadProfileData(user);
});
