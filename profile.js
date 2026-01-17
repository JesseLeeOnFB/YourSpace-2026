// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ===== GLOBAL ELEMENTS =====
const profilePfp = document.getElementById('profilePfp');
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const wallComments = document.getElementById('wallComments');
const wallCommentInput = document.getElementById('wallCommentInput');
const postWallCommentBtn = document.getElementById('postWallCommentBtn');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const pfpInput = document.getElementById('pfpInput');
const savePfpBtn = document.getElementById('savePfpBtn');
const musicLinkInput = document.getElementById('musicLinkInput');
const playMusicBtn = document.getElementById('playMusicBtn');
const pauseMusicBtn = document.getElementById('pauseMusicBtn');
const musicIframe = document.getElementById('musicIframe');
const customHtmlInput = document.getElementById('customHtmlInput');
const customHtmlContainer = document.getElementById('customHtmlContainer');

// Messaging elements
const threadsContainer = document.getElementById('threadsContainer');
const messageRecipient = document.getElementById('messageRecipient');
const messageText = document.getElementById('messageText');
const sendMessageBtn = document.getElementById('sendMessageBtn');

let currentUser = null;

// ===== AUTH & INITIAL LOAD =====
auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;
  const userDoc = await db.collection('users').doc(user.uid).get();
  const data = userDoc.data();

  if (data) {
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.top10Friends) renderTop10(data.top10Friends);
    if (data.theme) document.body.className = data.theme;
    if (data.pfpUrl) profilePfp.src = data.pfpUrl;
    if (data.customHtml) customHtmlContainer.innerHTML = data.customHtml;
  }

  loadWallComments();
  loadThreads();
});

// ===== PROFILE INFO =====
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).set({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });
};

// ===== THEME =====
saveThemeBtn.onclick = async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).set({ theme }, { merge: true });
};

// ===== CUSTOM HTML =====
document.getElementById('saveCustomHtmlBtn').onclick = async () => {
  const html = customHtmlInput.value;
  customHtmlContainer.innerHTML = html;
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).set({ customHtml: html }, { merge: true });
};

// ===== PROFILE PICTURE =====
savePfpBtn.onclick = async () => {
  if (!currentUser || !pfpInput.files[0]) return;
  const file = pfpInput.files[0];
  const ref = storage.ref(`profilePictures/${currentUser.uid}/${file.name}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  profilePfp.src = url;
  await db.collection('users').doc(currentUser.uid).set({ pfpUrl: url }, { merge: true });
};

// ===== WALL COMMENTS =====
postWallCommentBtn.onclick = async () => {
  if (!currentUser || !wallCommentInput.value.trim()) return;
  const comment = wallCommentInput.value.trim();
  await db.collection('users').doc(currentUser.uid)
    .collection('wallComments').add({
      authorId: currentUser.uid,
      authorName: usernameInput.value,
      text: comment,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  wallCommentInput.value = '';
  loadWallComments();
};

async function loadWallComments() {
  if (!currentUser) return;
  const commentsSnap = await db.collection('users').doc(currentUser.uid)
    .collection('wallComments').orderBy('timestamp', 'desc').get();
  wallComments.innerHTML = '';
  commentsSnap.forEach(doc => {
    const c = doc.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<span>${c.authorName}: ${c.text}</span>`;
    if (currentUser.uid === c.authorId || currentUser.uid === currentUser.uid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        await db.collection('users').doc(currentUser.uid)
          .collection('wallComments').doc(doc.id).delete();
        loadWallComments();
      };
      div.appendChild(delBtn);
    }
    wallComments.appendChild(div);
  });
}

// ===== TOP 10 FRIENDS DRAG-AND-DROP =====
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
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await db.collection('users').doc(currentUser.uid).set({ top10Friends: friends }, { merge: true });
  renderTop10(friends);
};

// ===== MUSIC PLAYER =====
playMusicBtn.onclick = () => {
  let url = musicLinkInput.value.trim();
  if (!url) return;

  // Convert YouTube / SoundCloud URLs to embed
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.split('v=')[1] || url.split('/').pop();
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes('soundcloud.com')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  }

  musicIframe.src = url;
};

pauseMusicBtn.onclick = () => {
  musicIframe.src = '';
};

// ===== NAVIGATION BUTTONS PLACEHOLDERS =====
document.getElementById('feedBtn').onclick = () => alert('Go to Feed');
document.getElementById('profileBtn').onclick = () => alert('Go to Profile');
document.getElementById('messagesNavBtn').onclick = () => alert('Go to Messages');
document.getElementById('settingsBtn').onclick = () => alert('Go to Settings');

// ===== MESSAGING =====
async function loadThreads() {
  if (!currentUser) return;
  const threadsSnap = await db.collection('messages')
    .where('participants', 'array-contains', currentUser.uid).get();
  threadsContainer.innerHTML = '';
  threadsSnap.forEach(doc => {
    const thread = doc.data();
    const div = document.createElement('div');
