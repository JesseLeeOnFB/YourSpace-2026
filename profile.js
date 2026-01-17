import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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

// DOM Elements
const profilePfp = document.getElementById('profilePfp');
const profilePfpInput = document.getElementById('profilePfpInput');
const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');

const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');

const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');
const customHtmlContainer = document.getElementById('customHtmlContainer');

let currentUser = null;

// --- Load Profile ---
async function loadProfile() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  profilePfp.src = data.pfpURL || '';

  // Wall Comments
  wallCommentsContainer.innerHTML = '';
  (data.wallComments || []).forEach(comment => {
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
    if (currentUser.uid === data.uid || currentUser.uid === comment.userId) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        // Delete logic here, optional based on Firestore structure
      };
      div.appendChild(delBtn);
    }
    wallCommentsContainer.appendChild(div);
  });

  // Top 10 Friends
  renderTop10(data.top10Friends || []);
  // Themes
  document.body.className = data.theme || 'default-theme';
  customHtmlContainer.innerHTML = data.customHtml || '';
}

// --- Save Profile Info ---
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  loadProfile();
};

// --- Save Profile Picture ---
saveProfilePfpBtn.onclick = async () => {
  if (!currentUser || !profilePfpInput.files[0]) return;
  const file = profilePfpInput.files[0];
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = url;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { pfpURL: url });
};

// --- Add Wall Comment ---
addWallCommentBtn.onclick = async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const comment = { text: wallCommentInput.value, username: usernameInput.value, userId: currentUser.uid, timestamp: Date.now() };
  await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile();
};

// --- Top 10 Friends Drag-and-Drop ---
function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', index));
    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
      const fromIndex = e.dataTransfer.getData('text/plain');
      const toIndex = index;
      if (fromIndex == toIndex) return;
      const movedFriend = friends.splice(fromIndex, 1)[0];
      friends.splice(toIndex, 0, movedFriend);
      renderTop10(friends);
    });
  });
}

editTop10Btn.onclick = async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const friends = Array.from(top10FriendsContainer.children).map(div => ({ username: div.textContent.replace(/^\d+\.\s/, '') }));
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
};

// --- Theme Selection ---
saveThemeBtn.onclick = async () => {
  if (!currentUser) return;
  const theme = themeSelect.value;
  document.body.className = theme;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { theme });
};

// --- Custom HTML ---
customHtmlInput.oninput = () => {
  customHtmlContainer.innerHTML = customHtmlInput.value;
};

// --- Auth ---
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUser = user;
  loadProfile();
});
