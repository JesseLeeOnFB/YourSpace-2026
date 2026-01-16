// --------------------------
// PROFILE.JS - Full Expanded Version
// Direct Firebase connection, cache-busting included
// --------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // --------------------------
  // DOM ELEMENTS
  // --------------------------
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

  const musicInput = document.getElementById('musicInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicContainer = document.getElementById('musicContainer');

  const navButtons = document.querySelectorAll('.navBtn');

  // --------------------------
  // FIREBASE DIRECT CONNECTION
  // --------------------------
  // Already configured globally: auth, db, storage

  // --------------------------
  // NAV BUTTONS
  // --------------------------
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      alert(`Navigation placeholder: ${btn.dataset.target}`);
      // Example: window.location.href = btn.dataset.target;
    });
  });

  // --------------------------
  // LOAD PROFILE
  // --------------------------
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    // Profile Info
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = data.pfpURL;

    // Wall Comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments && data.wallComments.length > 0) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `
          <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        `;
        // Add delete button if current user owns the profile
        if (user.uid === data.uid) {
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

    // Top 10 Friends (dummy display)
    top10FriendsContainer.innerHTML = '';
    if (data.top10Friends && data.top10Friends.length > 0) {
      data.top10Friends.forEach((friend, idx) => {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.innerHTML = `
          <span class="friend-rank">${idx + 1}</span>
          <img src="${friend.pfpURL || 'default.png'}" class="friend-pfp" />
          <span class="friend-username">${friend.username}</span>
        `;
        top10FriendsContainer.appendChild(div);
      });
    }

    // Theme
    document.body.className = data.theme || 'default';
  }

  // --------------------------
  // SAVE PROFILE INFO
  // --------------------------
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

  // --------------------------
  // SAVE PROFILE PICTURE
  // --------------------------
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

  // --------------------------
  // ADD WALL COMMENT
  // --------------------------
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

  // --------------------------
  // THEME SELECTION
  // --------------------------
  saveThemeBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const selectedTheme = themeSelect.value;

    document.body.className = selectedTheme;

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { theme: selectedTheme });
      alert('Theme applied!');
    } catch (err) {
      console.error(err);
      alert('Failed to save theme');
    }
  });

  // --------------------------
  // MUSIC PLAYER
  // --------------------------
  loadMusicBtn.addEventListener('click', () => {
    const url = musicInput.value.trim();
    if (!url) return alert('Enter a valid music URL');

    // Convert normal share links to embed
    let embedUrl = url;
    if (url.includes('youtube.com')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (url.includes('soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    }

    musicContainer.innerHTML = `<iframe width="100%" height="80" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  });

  // --------------------------
  // INIT
  // --------------------------
  auth.onAuthStateChanged(user => {
    if (!user) return;
    loadProfile();
  });
});
