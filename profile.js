// =========================
// PROFILE.JS - Full Rebuild
// Direct Firebase connection with cache-busting
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase imports assumed available globally
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

  const cacheBuster = `?v=${Date.now()}`;

  // Elements
  const profilePfp = document.getElementById('profilePfp');
  const usernameInput = document.getElementById('usernameInput');
  const bioInput = document.getElementById('bioInput');
  const locationInput = document.getElementById('locationInput');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  const wallContainer = document.getElementById('wallContainer');
  const wallCommentInput = document.getElementById('wallCommentInput');
  const postWallBtn = document.getElementById('postWallBtn');

  const top10FriendsContainer = document.getElementById('top10FriendsContainer');
  const editTop10Btn = document.getElementById('editTop10Btn');

  const musicInput = document.getElementById('musicInput');
  const musicIframe = document.getElementById('musicIframe');
  const playMusicBtn = document.getElementById('playMusicBtn');
  const pauseMusicBtn = document.getElementById('pauseMusicBtn');

  const themeSelect = document.getElementById('themeSelect');
  const saveThemeBtn = document.getElementById('saveThemeBtn');
  const customHtmlBox = document.getElementById('customHtmlBox');
  const customHtmlContainer = document.getElementById('customHtmlContainer');

  let currentUser, profileOwner;

  // -------------------------
  // Auth & load profile
  // -------------------------
  auth.onAuthStateChanged(async (user) => {
    if (!user) return alert('Not signed in');
    currentUser = user;

    // For simplicity, we load the current user's profile
    profileOwner = user;

    const profileDoc = await db.collection('users').doc(profileOwner.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};

    usernameInput.value = profileData.username || '';
    bioInput.value = profileData.bio || '';
    locationInput.value = profileData.location || '';
    themeSelect.value = profileData.theme || 'default';
    customHtmlContainer.innerHTML = profileData.customHtml || '';

    // Load profile picture
    try {
      const url = await storage.ref(`profilePictures/${profileOwner.uid}/pfp.jpg`).getDownloadURL();
      profilePfp.src = url + cacheBuster;
    } catch {
      profilePfp.src = 'default-pfp.jpg';
    }

    loadWallComments();
    renderTop10(profileData.top10Friends || []);
  });

  // -------------------------
  // Save profile info
  // -------------------------
  saveProfileBtn.addEventListener('click', async () => {
    await db.collection('users').doc(profileOwner.uid).set({
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    }, { merge: true });
    alert('Profile info saved!');
  });

  // -------------------------
  // Wall comments
  // -------------------------
  async function loadWallComments() {
    wallContainer.innerHTML = '';
    const snapshot = await db.collection('users').doc(profileOwner.uid).collection('wallComments').orderBy('createdAt').get();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${data.authorName || 'Unknown'}:</strong> ${data.text}`;

      if (data.authorId === currentUser.uid || profileOwner.uid === currentUser.uid) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          await db.collection('users').doc(profileOwner.uid).collection('wallComments').doc(docSnap.id).delete();
          loadWallComments();
        });
        div.appendChild(delBtn);
      }

      wallContainer.appendChild(div);
    });
  }

  postWallBtn.addEventListener('click', async () => {
    if (!wallCommentInput.value.trim()) return;
    await db.collection('users').doc(profileOwner.uid).collection('wallComments').add({
      text: wallCommentInput.value,
      authorId: currentUser.uid,
      authorName: usernameInput.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    wallCommentInput.value = '';
    loadWallComments();
  });

  // -------------------------
  // Top 10 drag-and-drop
  // -------------------------
  function renderTop10(friends) {
    top10FriendsContainer.innerHTML = '';
    friends.forEach((friend, index) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.draggable = true;
      div.dataset.index = index;
      div.textContent = `${index + 1}. ${friend.username || friend.email || 'Unknown'}`;
      top10Friends
