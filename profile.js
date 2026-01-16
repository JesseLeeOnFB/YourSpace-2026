// PROFILE.JS - Non-module version for YourSpace

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
const addFriendInput = document.getElementById('addFriendInput');
const addFriendBtn = document.getElementById('addFriendBtn');
const friendPreviewContainer = document.getElementById('friendPreviewContainer');

// ------------------ Load Profile ------------------
function loadProfile() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const userDocRef = firebase.firestore().collection('users').doc(user.uid);
  userDocRef.get().then(docSnap => {
    if (!docSnap.exists) return;

    const data = docSnap.data();
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL || 'default_profile.png';

    // Load wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `
          <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
          ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
        `;
        if (comment.userId === user.uid) {
          div.querySelector('.deleteWallCommentBtn').addEventListener('click', () => {
            userDocRef.update({
              wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
            }).then(() => loadProfile());
          });
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // Load Top 10 Friends
    top10FriendsContainer.innerHTML = '';
    if (data.top10Friends) {
      data.top10Friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.innerHTML = `<span>${friend.username}</span>`;
        top10FriendsContainer.appendChild(div);
      });
    }
  });
}

// ------------------ Save Profile Info ------------------
saveProfileBtn.addEventListener('click', () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const userDocRef = firebase.firestore().collection('users').doc(user.uid);
  userDocRef.update({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }).then(() => alert('Profile info updated!'))
    .catch(err => { console.error(err); alert('Failed to update profile info'); });
});

// ------------------ Save Profile Picture ------------------
saveProfilePfpBtn.addEventListener('click', () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');

  const user = firebase.auth().currentUser;
  const storageRef = firebase.storage().ref(`profileImages/${user.uid}/${Date.now()}_${file.name}`);

  storageRef.put(file).then(snapshot => snapshot.ref.getDownloadURL())
    .then(url => {
      profilePfp.src = url;
      return firebase.firestore().collection('users').doc(user.uid).update({ pfpURL: url });
    })
    .then(() => alert('Profile picture updated!'))
    .catch(err => { console.error(err); alert('Failed to save profile picture'); });
});

// ------------------ Add Wall Comment ------------------
addWallCommentBtn.addEventListener('click', () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const text = wallCommentInput.value.trim();
  if (!text) return;

  const comment = {
    text,
    userId: user.uid,
    username: usernameInput.value || 'Unknown',
    timestamp: Date.now()
  };

  const userDocRef = firebase.firestore().collection('users').doc(user.uid);
  userDocRef.update({
    wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
  }).then(() => {
    wallCommentInput.value = '';
    loadProfile();
  }).catch(err => { console.error(err); alert('Failed to post comment'); });
});

// ------------------ Add Friend ------------------
addFriendBtn.addEventListener('click', () => {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const friendName = addFriendInput.value.trim();
  if (!friendName) return alert('Enter a username');

  // Search user by username
  firebase.firestore().collection('users').where('username', '==', friendName).get()
    .then(snapshot => {
      if (snapshot.empty) return alert('User not found');
      const friendDoc = snapshot.docs[0];
      const friendData = friendDoc.data();

      // Show preview
      friendPreviewContainer.innerHTML = `
        <img src="${friendData.pfpURL || 'default_profile.png'}" alt="Profile" width="50">
        <span>${friendData.username}</span>
      `;

      // Send friend request
      firebase.firestore().collection('users').doc(friendDoc.id).update({
        pendingRequests: firebase.firestore.FieldValue.arrayUnion({
          fromUserId: user.uid,
          fromUsername: usernameInput.value || 'Unknown',
          timestamp: Date.now()
        })
      }).then(() => alert('Friend request sent!'))
        .catch(err => { console.error(err); alert('Failed to send friend request'); });
    });
});

// ------------------ Init ------------------
firebase.auth().onAuthStateChanged(user => {
  if (user) loadProfile();
});
