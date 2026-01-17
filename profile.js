import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// ---------------- Firebase Config ----------------
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

// ---------------- DOM Elements ----------------
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

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');

const customHtmlInput = document.getElementById('customHtmlInput');
const customHtmlContainer = document.getElementById('customHtmlContainer');

const musicLinkInput = document.getElementById('musicLinkInput');
const saveMusicBtn = document.getElementById('saveMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// ---------------- Utility ----------------
function cacheBuster() { return Date.now(); }

// ---------------- Load Profile ----------------
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
  if (data.pfpURL) profilePfp.src = data.pfpURL + '?cb=' + cacheBuster();

  // Wall Comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${user.uid === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
      `;
      const deleteBtn = div.querySelector('.deleteWallCommentBtn');
      if(deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          await updateDoc(userDocRef, {
            wallComments: arrayRemove(comment)
          });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 Friends (Dummy)
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends) {
    data.top10Friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<img src="${f.pfpURL || ''}" width="40" height="40" style="border-radius:50%;object-fit:cover;"> <span>${f.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Theme
  if(data.theme) document.body.className = data.theme;

  // Custom HTML
  if(data.customHtml) customHtmlContainer.innerHTML = data.customHtml;
}

// ---------------- Event Listeners ----------------

// Save profile info
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if(!user) return;
  const userDocRef = doc(db,'users',user.uid);
  await updateDoc(userDocRef,{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  loadProfile();
});

// Save profile picture
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if(!file) return alert('Select a picture first');
  const user = auth.currentUser;
  const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef,file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db,'users',user.uid),{pfpURL:url});
  profilePfp.src = url + '?cb=' + cacheBuster();
});

// Add wall comment
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if(!user) return;
  const comment = {
    text: wallCommentInput.value,
    username: usernameInput.value,
    authorId: user.uid,
    timestamp: Date.now()
  };
  await updateDoc(doc(db,'users',user.uid),{
    wallComments: arrayUnion(comment)
  });
  wallCommentInput.value='';
  loadProfile();
});

// Theme
saveThemeBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db,'users',user.uid),{theme});
});

// Custom HTML
customHtmlInput.addEventListener('input', async () => {
  const user = auth.currentUser;
  const html = customHtmlInput.value;
  customHtmlContainer.innerHTML = html;
  await updateDoc(doc(db,'users',user.uid),{customHtml:html});
});

// Music player
saveMusicBtn.addEventListener('click', () => {
  let link = musicLinkInput.value.trim();
  if(!link) return;
  // Convert standard share links to embed (simplified)
  if(link.includes('youtube.com')) link = link.replace('watch?v=','embed/');
  musicIframe.src = link + '?autoplay=1';
});

// Initialize
onAuthStateChanged(auth,user => {
  if(user) loadProfile();
});
