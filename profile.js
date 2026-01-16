// ================= PROFILE.JS =================
// Direct Firebase connection, cache-busting included

// Firebase imports (v9 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// ================= FIREBASE CONFIG =================
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

// ================= DOM ELEMENTS =================
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
const addFriendInput = document.getElementById('addFriendInput');
const addFriendPreview = document.getElementById('addFriendPreview');

let currentUserId = null;

// ================= LOAD PROFILE =================
async function loadProfile() {
  if (!currentUserId) return;
  const userDocRef = doc(db, 'users', currentUserId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';

  if (data.pfpURL) {
    profilePfp.src = data.pfpURL + `?cb=${Date.now()}`; // cache-busting
  }

  // WALL COMMENTS
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} ${
        comment.userId === currentUserId ? '<button class="deleteWallCommentBtn">Delete</button>' : ''
      }`;

      if (comment.userId === currentUserId) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, {
            wallComments: arrayRemove(comment)
          });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // TOP 10 FRIENDS
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends && data.top10Friends.length > 0) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = friend.username || 'Unknown';
      top10FriendsContainer.appendChild(div);
    });
  }
}

// ================= SAVE PROFILE INFO =================
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUserId) return;
  const userDocRef = doc(db, 'users', currentUserId);
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert('Profile info updated!');
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to update profile info');
  }
});

// ================= SAVE PROFILE PICTURE =================
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');
  try {
    const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = url + `?cb=${Date.now()}`;

    const userDocRef = doc(db, 'users', currentUserId);
    await updateDoc(userDocRef, { pfpURL: url });
    alert('Profile picture updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to save profile picture');
  }
});

// ================= ADD WALL COMMENT =================
addWallCommentBtn.addEventListener('click', async () => {
  if (!currentUserId) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const comment = {
    text,
    userId: currentUserId,
    username: usernameInput.value || 'Unknown',
    timestamp: Date.now()
  };

  const userDocRef = doc(db, 'users', currentUserId);
  try {
    await updateDoc(userDocRef, {
      wallComments: arrayUnion(comment)
    });
    wallCommentInput.value = '';
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to post comment');
  }
});

// ================= ADD FRIEND SEARCH & REQUEST =================
addFriendInput.addEventListener('input', async () => {
  const searchValue = addFriendInput.value.trim();
  if (!searchValue) return addFriendPreview.innerHTML = '';

  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('username', '==', searchValue));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    addFriendPreview.innerHTML = 'User not found';
    return;
  }

  const userDoc = querySnapshot.docs[0];
  const data = userDoc.data();

  addFriendPreview.innerHTML = `<div>${data.username} <button id="addFriendBtn">Add Friend</button></div>`;

  document.getElementById('addFriendBtn').addEventListener('click', async () => {
    try {
      const targetUserRef = doc(db, 'users', userDoc.id);
      await updateDoc(targetUserRef, {
        pendingRequests: arrayUnion({ userId: currentUserId, username: usernameInput.value })
      });
      addFriendPreview.innerHTML = 'Friend request sent!';
    } catch (err) {
      console.error(err);
      addFriendPreview.innerHTML = 'Failed to send friend request';
    }
  });
});

// ================= INIT =================
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUserId = user.uid;
  loadProfile();
});
