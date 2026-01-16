// PROFILE.JS - YourSpace
// Direct Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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

// Add Friend elements
const searchUserInput = document.getElementById('searchUserInput');
const searchPreviewContainer = document.getElementById('searchPreviewContainer');

// ===== Load Current Profile =====
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  // Profile info
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
      // Delete button only for your own comment
      if (comment.userId === user.uid) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'deleteWallCommentBtn';
        delBtn.addEventListener('click', async () => {
          await updateDoc(userDocRef, {
            wallComments: arrayRemove(comment)
          });
          loadProfile();
        });
        div.appendChild(delBtn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends && data.top10Friends.length > 0) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = `${friend.username || 'Unknown'} (${friend.rank || ''})`;
      top10FriendsContainer.appendChild(div);
    });
  }
}

// ===== Save Profile Info =====
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert('Profile info updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to update profile info');
  }
});

// ===== Save Profile Picture =====
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');

  try {
    const user = auth.currentUser;
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    profilePfp.src = url;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert('Profile picture updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to save profile picture');
  }
});

// ===== Add Wall Comment =====
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const comment = {
    text,
    userId: user.uid,
    username: usernameInput.value || 'Unknown',
    timestamp: Date.now()
  };

  const userDocRef = doc(db, 'users', user.uid);
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

// ===== Search Users for Friend Requests =====
searchUserInput.addEventListener('input', async () => {
  const search = searchUserInput.value.trim();
  searchPreviewContainer.innerHTML = '';
  if (!search) return;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '>=', search), where('username', '<=', search + '\uf8ff'));
  const querySnap = await getDocs(q);

  querySnap.forEach(docSnap => {
    const userData = docSnap.data();
    if (docSnap.id === auth.currentUser.uid) return; // skip self

    const div = document.createElement('div');
    div.className = 'user-preview';
    div.innerHTML = `
      <span>${userData.username}</span>
      <button class="addFriendBtn">Add Friend</button>
    `;

    // Add Friend button
    div.querySelector('.addFriendBtn').addEventListener('click', async () => {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const targetUserRef = doc(db, 'users', docSnap.id);

      try {
        // Add to target user's pendingRequests
        await updateDoc(targetUserRef, {
          pendingRequests: arrayUnion({
            userId: auth.currentUser.uid,
            username: usernameInput.value
          })
        });

        // Optionally, add to your local "sentRequests" array if needed
        alert(`Friend request sent to ${userData.username}`);
        searchPreviewContainer.innerHTML = '';
        searchUserInput.value = '';
      } catch (err) {
        console.error(err);
        alert('Failed to send friend request');
      }
    });

    searchPreviewContainer.appendChild(div);
  });
});

// ===== Auth Init =====
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile();
});
