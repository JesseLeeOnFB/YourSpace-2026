import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM Elements
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
const allFriendsContainer = document.getElementById('allFriendsContainer');
const friendSearchInput = document.getElementById('friendSearchInput');
const friendSearchPreview = document.getElementById('friendSearchPreview');
const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');
const logoutBtn = document.getElementById('logoutBtn');
const musicUrlInput = document.getElementById('musicUrlInput');
const playMusicBtn = document.getElementById('playMusicBtn');
const musicPlayerContainer = document.getElementById('musicPlayerContainer');

// Helpers
async function getUserDoc(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

// Load profile
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Wall Comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} 
        ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Friends
  top10FriendsContainer.innerHTML = '';
  allFriendsContainer.innerHTML = '';
  pendingRequestsContainer.innerHTML = '';

  if (data.top10Friends) {
    data.top10Friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = f.username;
      top10FriendsContainer.appendChild(div);
    });
  }

  if (data.friends) {
    data.friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'friend';
      div.textContent = f.username;
      allFriendsContainer.appendChild(div);
    });
  }

  if (data.pendingRequests) {
    data.pendingRequests.forEach(f => {
      const div = document.createElement('div');
      div.className = 'pending-friend';
      div.textContent = `${f.username} wants to be your friend`;
      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accept';
      acceptBtn.addEventListener('click', async () => {
        // Add to friends
        await updateDoc(userDocRef, {
          friends: arrayUnion(f),
          pendingRequests: arrayRemove(f)
        });
        // Update sender top10Friends empty until they add manually
        const senderRef = doc(db, 'users', f.userId);
        await updateDoc(senderRef, { friends: arrayUnion({ userId: user.uid, username: data.username }) });
        loadProfile();
      });
      const denyBtn = document.createElement('button');
      denyBtn.textContent = 'Deny';
      denyBtn.addEventListener('click', async () => {
        await updateDoc(userDocRef, { pendingRequests: arrayRemove(f) });
        loadProfile();
      });
      div.appendChild(acceptBtn);
      div.appendChild(denyBtn);
      pendingRequestsContainer.appendChild(div);
    });
  }
}

// Event Listeners

// Save profile info
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info updated!');
});

// Save profile picture
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');
  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = url;
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { pfpURL: url });
  alert('Profile picture updated!');
});

// Wall comment
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = { text, userId: user.uid, username: usernameInput.value || 'Unknown', timestamp: Date.now() };
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile();
});

// Friend search
friendSearchInput.addEventListener('input', async () => {
  friendSearchPreview.innerHTML = '';
  const search = friendSearchInput.value.trim();
  if (!search) return;
  const q = query(collection(db, 'users'), where('username', '==', search));
  const querySnap = await getDocs(q);
  querySnap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.textContent = data.username;
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Friend';
    addBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      const senderRef = doc(db, 'users', user.uid);
      const receiverRef = doc(db, 'users', docSnap.id);
      const senderData = await getUserDoc(user.uid);
      const receiverData = await getUserDoc(docSnap.id);
      // Add to receiver pendingRequests
      await updateDoc(receiverRef, { pendingRequests: arrayUnion({ userId: user.uid, username: senderData.username }) });
      alert('Friend request sent!');
      friendSearchInput.value = '';
      friendSearchPreview.innerHTML = '';
    });
    div.appendChild(addBtn);
    friendSearchPreview.appendChild(div);
  });
});

// Music player
playMusicBtn.addEventListener('click', () => {
  const url = musicUrlInput.value.trim();
  if (!url) return;
  musicPlayerContainer.innerHTML = '';
  const audio = document.createElement('audio');
  audio.src = url;
  audio.controls = true;
  musicPlayerContainer.appendChild(audio);
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// Initialize
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
