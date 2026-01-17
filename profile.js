// PROFILE.JS - Full, ready-to-paste
// Direct Firebase connection with cache-busting

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, deleteDoc, orderBy } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";

// Firebase config (current)
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

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    currentUser = user;
    const userId = user.uid;

    // ===== Load Profile Info =====
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      document.getElementById('usernameInput').value = data.username || '';
      document.getElementById('bioInput').value = data.bio || '';
      document.getElementById('locationInput').value = data.location || '';
      renderTop10(data.top10Friends || []);
      if (data.theme) applyTheme(data.theme);
      if (data.customHtml) document.getElementById('customHtmlContainer').innerHTML = data.customHtml;
    }

    // ===== Load Profile Picture =====
    try {
      const pfpRef = ref(storage, `profilePictures/${userId}/profile.jpg`);
      const url = await getDownloadURL(pfpRef);
      document.getElementById('profilePfp').src = url + '?v=' + Date.now(); // cache buster
    } catch (err) {
      console.log("Profile picture not found", err);
    }

    // ===== Load Wall Comments =====
    loadWallComments(userId);

    // ===== Navbar Buttons =====
    document.getElementById('navFeed').addEventListener('click', () => window.location.href = 'feed.html');
    document.getElementById('navProfile').addEventListener('click', () => window.location.href = 'profile.html');
    document.getElementById('navMessages').addEventListener('click', () => window.location.href = 'messages.html');
    document.getElementById('navSettings').addEventListener('click', () => window.location.href = 'settings.html');

    // ===== Save Profile Info =====
    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
      await updateDoc(userDocRef, {
        username: document.getElementById('usernameInput').value,
        bio: document.getElementById('bioInput').value,
        location: document.getElementById('locationInput').value
      });
      alert('Profile info saved!');
    });

    // ===== Save Profile Picture =====
    document.getElementById('savePfpBtn').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const pfpRef = ref(storage, `profilePictures/${userId}/profile.jpg`);
      await uploadBytes(pfpRef, file);
      const url = await getDownloadURL(pfpRef);
      document.getElementById('profilePfp').src = url + '?v=' + Date.now();
      alert('Profile picture saved!');
    });

    // ===== Wall Comment Submission =====
    document.getElementById('wallCommentBtn').addEventListener('click', async () => {
      const text = document.getElementById('wallCommentInput').value.trim();
      if (!text) return;
      const commentRef = collection(db, 'users', userId, 'wallComments');
      await addDoc(commentRef, {
        authorId: currentUser.uid,
        authorUsername: document.getElementById('usernameInput').value,
        text: text,
        createdAt: Date.now()
      });
      document.getElementById('wallCommentInput').value = '';
      loadWallComments(userId);
    });

    // ===== Top 10 Friends =====
    const top10FriendsContainer = document.getElementById('top10FriendsContainer');
    const editTop10Btn = document.getElementById('editTop10Btn');

    async function loadAllUsers() {
      const q = query(collection(db, 'users'), orderBy('username'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, username: d.data().username }));
    }

    async function renderTop10(top10 = []) {
      top10FriendsContainer.innerHTML = '';
      const allUsers = await loadAllUsers();

      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.draggable = true;

        let friend = top10[i] || {};
        div.dataset.index = i;

        const username = friend.username || '';
        div.textContent = `${i + 1}. ${username}`;

        top10FriendsContainer.appendChild(div);

        // Drag-and-drop events
        div.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', i));
        div.addEventListener('dragover', (e) => e.preventDefault());
        div.addEventListener('drop', (e) => {
          const fromIndex = e.dataTransfer.getData('text/plain');
          const toIndex = i;
          if (fromIndex == toIndex) return;
          const moved = top10.splice(fromIndex, 1)[0];
          top10.splice(toIndex, 0, moved);
          renderTop10(top10);
        });
      }
    }

    editTop10Btn.addEventListener('click', async () => {
      const friends = Array.from(top10FriendsContainer.children).map(div => ({
        username: div.textContent.replace(/^\d+\.\s/, '')
      }));
      await updateDoc(userDocRef, { top10Friends: friends });
      renderTop10(friends);
      alert('Top 10 friends updated!');
    });

    // ===== Music Player =====
    const musicInput = document.getElementById('musicInput');
    const musicIframe = document.getElementById('musicIframe');

    musicInput.addEventListener('change', () => {
      let url = musicInput.value.trim();
      if (!url) return;
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = url.includes('youtu.be') ? url.split('/').pop() : new URL(url).searchParams.get('v');
        musicIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else if (url.includes('soundcloud.com')) {
        musicIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
      } else {
        musicIframe.src = url;
      }
    });

    // ===== Themes & Custom HTML =====
    const themeSelect = document.getElementById('themeSelect');
    themeSelect.addEventListener('change', () => {
      applyTheme(themeSelect.value);
      updateDoc(userDocRef, { theme: themeSelect.value });
    });

    const customHtmlInput = document.getElementById('customHtmlInput');
    document.getElementById('saveCustomHtmlBtn').addEventListener('click', async () => {
      const html = customHtmlInput.value;
      document.getElementById('customHtmlContainer').innerHTML = html;
      await updateDoc(userDocRef, { customHtml: html });
    });

  });
});

// ===== Functions =====
function applyTheme(theme) {
  document.body.className = '';
  document.body.classList.add(theme + '-theme');
}

// ===== Wall Comments Loader =====
async function loadWallComments(profileUserId) {
  const wallContainer = document.getElementById('wallContainer');
  wallContainer.innerHTML = '';
  const commentRef = collection(db, 'users', profileUserId, 'wallComments');
  const snap = await getDocs(commentRef);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<strong>${data.authorUsername || 'Unknown'}:</strong> ${data.text}`;
    // Delete button if owner or profile owner
    if (currentUser && (currentUser.uid === data.authorId || currentUser.uid === profileUserId)) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        await deleteDoc(doc(commentRef, docSnap.id));
        loadWallComments(profileUserId);
      });
      div.appendChild(delBtn);
    }
    wallContainer.appendChild(div);
  });
}
