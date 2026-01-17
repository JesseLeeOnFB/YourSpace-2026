import { auth, db } from './firebase-init.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', async () => {
  const feedPostsContainer = document.getElementById('feedPostsContainer');
  const postButton = document.getElementById('postButton');
  const newPostInput = document.getElementById('newPostInput');

  // NAVIGATION BUTTONS
  document.getElementById('navFeedBtn').addEventListener('click', () => window.location.href = 'feed.html');
  document.getElementById('navProfileBtn').addEventListener('click', () => window.location.href = 'profile.html');
  document.getElementById('navMessagesBtn').addEventListener('click', () => window.location.href = 'messages.html');
  document.getElementById('navSettingsBtn').addEventListener('click', () => window.location.href = 'settings.html');

  if (!feedPostsContainer || !postButton || !newPostInput) return;

  // Load posts from Firestore
  async function loadPosts() {
    feedPostsContainer.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, 'posts'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement('div');
      postDiv.className = 'feed-post';
      postDiv.innerHTML = `
        <strong>${data.authorUsername || 'Unknown'}</strong>: ${data.content}
      `;
      feedPostsContainer.prepend(postDiv);
    });
  }

  await loadPosts();

  // Post new content
  postButton.addEventListener('click', async () => {
    const content = newPostInput.value.trim();
    if (!content) return;

    await addDoc(collection(db, 'posts'), {
      authorId: auth.currentUser.uid,
      authorUsername: auth.currentUser.displayName || 'Unknown',
      content,
      timestamp: serverTimestamp()
    });

    newPostInput.value = '';
    await loadPosts();
  });
});
