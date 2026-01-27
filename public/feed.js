// feed.js - COMPLETELY FIXED - All Issues Resolved
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

const GIFT_PAYMENT_LINKS = {
  coffee: "https://buy.stripe.com/7sY9ATf5garQaYrg8x7bW01",
  rose: "https://buy.stripe.com/3cIaEXg9kdE25E7g8x7bW00",
  teddybear: "https://buy.stripe.com/cNi7sL2iugQed6z6xX7bW02",
  cake: "https://buy.stripe.com/14A5kD0am2Zo9UncWl7bW03",
  diamond: "https://buy.stripe.com/aFa3cvcX8bvU2rVg8x7bW04",
  yacht: "https://buy.stripe.com/eVqaEX8GS2Zo6Ib2hH7bW05"
};

let currentGiftPost = null;
let currentGiftRecipient = null;
let currentGiftUsername = null;

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
document.getElementById('feedNavBtn').onclick = () => window.location.href = 'feed.html';
document.getElementById('profileNavBtn').onclick = () => window.location.href = 'profile.html';
document.getElementById('messagesNavBtn').onclick = () => window.location.href = 'messages.html';
document.getElementById('notificationsNavBtn').onclick = () => window.location.href = 'notifications.html';
document.getElementById('dashboardNavBtn').onclick = () => window.location.href = 'dashboard.html';
document.getElementById('adminNavBtn').onclick = () => window.location.href = 'admin.html';
document.getElementById('contactNavBtn').onclick = () => window.location.href = 'contact.html';
document.getElementById('logoutBtn').onclick = async () => {
  await auth.signOut();
  window.location.href = 'login.html';
};

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.onclick = () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
};

// ═══════════════════════════════════════════════════════════
// USER SEARCH - FIXED
// ═══════════════════════════════════════════════════════════
const searchBar = document.getElementById('searchBar');
const searchResults = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');
let searchTimeout;

searchBar.addEventListener('input', async (e) => {
  const searchTerm = e.target.value.trim().toLowerCase();
 
  if (searchTerm.length === 0) {
    searchResults.style.display = 'none';
    clearSearchBtn.style.display = 'none';
    return;
  }
 
  clearSearchBtn.style.display = 'block';
 
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      // FIXED: Search using usernameLower field
      const usersSnapshot = await db.collection('users')
        .where('usernameLower', '>=', searchTerm)
        .where('usernameLower', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get();
     
      searchResults.innerHTML = '';
     
      if (usersSnapshot.empty) {
        searchResults.innerHTML = '<p class="no-results">No users found</p>';
      } else {
        usersSnapshot.forEach(doc => {
          const user = doc.data();
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = `
            <img src="${user.photoURL || 'https://via.placeholder.com/45'}" class="search-result-avatar" alt="Avatar">
            <span class="search-result-username">@${user.username}</span>
          `;
          // FIXED: Correct profile navigation
          item.onclick = () => {
            window.location.href = `profile.html?uid=${doc.id}`;
          };
          searchResults.appendChild(item);
        });
      }
     
      searchResults.style.display = 'block';
     
    } catch (error) {
      console.error('Search error:', error);
      searchResults.innerHTML = '<p class="no-results">Error searching users</p>';
      searchResults.style.display = 'block';
    }
  }, 300);
});

clearSearchBtn.onclick = () => {
  searchBar.value = '';
  searchResults.style.display = 'none';
  clearSearchBtn.style.display = 'none';
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    searchResults.style.display = 'none';
  }
});

// ═══════════════════════════════════════════════════════════
// CREATE POST
// ═══════════════════════════════════════════════════════════
const postBtn = document.getElementById('postBtn');
const postText = document.getElementById('postText');
const postFileInput = document.getElementById('postFileInput');

postBtn.onclick = async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];
 
  if (!text && !file) {
    return alert('Post cannot be empty');
  }
 
  const user = auth.currentUser;
  if (!user) return;
 
  postBtn.disabled = true;
  postBtn.textContent = 'Posting...';
 
  try {
    let mediaURL = '';
    let mediaType = '';
   
    if (file) {
      mediaType = file.type.startsWith('video') ? 'video' : 'image';
      const storageRef = storage.ref(`posts/${user.uid}/${Date.now()}_${file.name}`);
      await storageRef.put(file);
      mediaURL = await storageRef.getDownloadURL();
    }
   
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email.split('@')[0];
   
    await db.collection('posts').add({
      userId: user.uid,
      username: username,
      usernameLower: username.toLowerCase(),
      text: text,
      mediaURL: mediaURL,
      mediaType: mediaType,
      likedBy: [],
      dislikedBy: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
   
    postText.value = '';
    postFileInput.value = '';
    postBtn.textContent = 'Post';
    postBtn.disabled = false;
   
    loadPosts();
   
  } catch (error) {
    console.error('Post error:', error);
    alert('Error creating post: ' + error.message);
    postBtn.textContent = 'Post';
    postBtn.disabled = false;
  }
};

// ═══════════════════════════════════════════════════════════
// LOAD POSTS
// ═══════════════════════════════════════════════════════════
async function loadPosts() {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '<p style="text-align:center;color:#666;">Loading...</p>';
 
  try {
    const snapshot = await db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
   
    container.innerHTML = '';
   
    if (snapshot.empty) {
      container.innerHTML = '<p style="text-align:center;color:#666;">No posts yet. Be the first!</p>';
      return;
    }
   
    snapshot.forEach(doc => {
      renderPost(doc.data(), doc.id);
    });
   
  } catch (error) {
    console.error('Load posts error:', error);
    container.innerHTML = '<p style="text-align:center;color:red;">Error loading posts</p>';
  }
}

function renderPost(post, postId) {
  const container = document.getElementById('postsContainer');
  const user = auth.currentUser;
  const isOwner = post.userId === user.uid;
  const isAdmin = ADMIN_EMAILS.includes(user.email);
 
  const postDiv = document.createElement('div');
  postDiv.className = 'post-card';
  postDiv.id = `post-${postId}`;
 
  const timestamp = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
  const likeCount = post.likedBy?.length || 0;
  const dislikeCount = post.dislikedBy?.length || 0;
  const isLiked = post.likedBy?.includes(user.uid);
  const isDisliked = post.dislikedBy?.includes(user.uid);
 
  // FIXED: Profile link with correct UID
  postDiv.innerHTML = `
    <div class="post-header">
      <strong style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${post.userId}'">${post.username}</strong>
      <small>${timestamp}</small>
    </div>
    <p>${post.text || ''}</p>
    ${post.mediaURL ? (
      post.mediaType === 'video'
        ? `<video controls src="${post.mediaURL}" class="post-media"></video>`
        : `<img src="${post.mediaURL}" class="post-media" />`
    ) : ''}
    <div class="actions">
      <button class="like-btn ${isLiked ? 'active' : ''}" data-postid="${postId}">👍 ${likeCount}</button>
      <button class="dislike-btn ${isDisliked ? 'active' : ''}" data-postid="${postId}">👎 ${dislikeCount}</button>
      <button class="comment-toggle" data-postid="${postId}">💬 Comments</button>
      <button class="share-btn" data-postid="${postId}">🔗 Share</button>
      ${!isOwner ? `<button class="gift-btn" data-postid="${postId}" data-recipient="${post.userId}" data-username="${post.username}">🎁 Gift</button>` : ''}
      ${isOwner ? `<button class="delete-btn" data-postid="${postId}">🗑️ Delete</button>` : ''}
      ${isAdmin ? `<button class="pin-btn" data-postid="${postId}">📌 Pin</button>` : ''}
    </div>
    <div class="comments-section" id="comments-${postId}" style="display:none;">
      <div class="comments-list" id="comments-list-${postId}"></div>
      <div class="comment-form">
        <input type="text" placeholder="Write a comment..." class="comment-input" id="comment-input-${postId}">
        <button class="comment-btn" data-postid="${postId}">Send</button>
      </div>
    </div>
  `;
 
  container.appendChild(postDiv);
  loadComments(postId);
}

// ═══════════════════════════════════════════════════════════
// POST ACTIONS - COMPLETELY FIXED
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', async (e) => {
  const postId = e.target.dataset.postid;
  if (!postId) return;
 
  const userId = auth.currentUser.uid;
 
  // LIKE - FIXED
  if (e.target.classList.contains('like-btn')) {
    try {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
     
      if (post.likedBy?.includes(userId)) {
        // Remove like
        await postRef.update({
          likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      } else {
        // Add like, remove dislike
        await postRef.update({
          likedBy: firebase.firestore.FieldValue.arrayUnion(userId),
          dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      }
      loadPosts();
    } catch (error) {
      console.error('Like error:', error);
    }
  }
 
  // DISLIKE - FIXED
  if (e.target.classList.contains('dislike-btn')) {
    try {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
     
      if (post.dislikedBy?.includes(userId)) {
        // Remove dislike
        await postRef.update({
          dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      } else {
        // Add dislike, remove like
        await postRef.update({
          dislikedBy: firebase.firestore.FieldValue.arrayUnion(userId),
          likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      }
      loadPosts();
    } catch (error) {
      console.error('Dislike error:', error);
    }
  }
 
  // COMMENT TOGGLE
  if (e.target.classList.contains('comment-toggle')) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
  }
 
  // SHARE
  if (e.target.classList.contains('share-btn')) {
    const url = `${window.location.origin}/feed.html#post-${postId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }
 
  // GIFT
  if (e.target.classList.contains('gift-btn')) {
    currentGiftPost = postId;
    currentGiftRecipient = e.target.dataset.recipient;
    currentGiftUsername = e.target.dataset.username;
    document.getElementById('giftRecipientName').textContent = currentGiftUsername;
    document.getElementById('giftDialog').style.display = 'flex';
  }
 
  // DELETE
  if (e.target.classList.contains('delete-btn')) {
    if (confirm('Delete this post?')) {
      await db.collection('posts').doc(postId).delete();
      loadPosts();
    }
  }
 
  // PIN (admin only)
  if (e.target.classList.contains('pin-btn')) {
    await db.collection('posts').doc(postId).update({
      pinned: true
    });
    loadPosts();
  }
 
  // COMMENT - FIXED
  if (e.target.classList.contains('comment-btn')) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;
   
    const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
    const username = userDoc.data()?.username || auth.currentUser.email.split('@')[0];
   
    await db.collection('posts').doc(postId).collection('comments').add({
      userId: auth.currentUser.uid,
      username: username,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
   
    input.value = '';
    loadComments(postId);
  }
});

// ═══════════════════════════════════════════════════════════
// COMMENTS - FIXED
// ═══════════════════════════════════════════════════════════
async function loadComments(postId) {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  if (!commentsList) return;
 
  try {
    const snapshot = await db.collection('posts').doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();
   
    commentsList.innerHTML = '';
   
    if (snapshot.empty) {
      commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
      return;
    }
   
    snapshot.forEach(doc => {
      const comment = doc.data();
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-thread';
     
      const timestamp = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Just now';
      const isOwner = comment.userId === auth.currentUser.uid;
     
      commentDiv.innerHTML = `
        <div class="comment-avatar">
          <div class="avatar-circle">${comment.username.charAt(0).toUpperCase()}</div>
        </div>
        <div class="comment-content">
          <div class="comment-header">
            <strong class="comment-username">${comment.username}</strong>
            <small class="comment-time">${timestamp}</small>
          </div>
          <p class="comment-text">${comment.text}</p>
          ${isOwner ? `<button class="delete-comment" data-commentid="${doc.id}" data-postid="${postId}">Delete</button>` : ''}
        </div>
      `;
      commentsList.appendChild(commentDiv);
    });
   
    // Delete comment handler
    commentsList.querySelectorAll('.delete-comment').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this comment?')) {
          const commentId = btn.dataset.commentid;
          const postId = btn.dataset.postid;
          await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
          loadComments(postId);
        }
      };
    });
   
  } catch (error) {
    console.error('Load comments error:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// GIFT DIALOG
// ═══════════════════════════════════════════════════════════
document.getElementById('cancelGiftBtn').onclick = () => {
  document.getElementById('giftDialog').style.display = 'none';
};

document.querySelectorAll('.gift-option').forEach(option => {
  option.onclick = async () => {
    const giftType = option.dataset.gift;
   
    if (!currentGiftPost || !currentGiftRecipient) {
      alert('Error: Missing post or recipient information');
      return;
    }
   
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in');
      return;
    }
   
    document.getElementById('giftDialog').style.display = 'none';
   
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const username = userDoc.data()?.username || user.email.split('@')[0];
     
      // Create gift record with metadata for Stripe
      const giftRef = await db.collection('gifts').add({
        fromUserId: user.uid,
        fromUsername: username,
        toUserId: currentGiftRecipient,
        toUsername: currentGiftUsername,
        postId: currentGiftPost,
        giftType: giftType,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
     
      await new Promise(resolve => setTimeout(resolve, 500));
     
      // Redirect to Stripe with gift ID
      const paymentLink = GIFT_PAYMENT_LINKS[giftType];
      if (paymentLink) {
        window.location.href = `${paymentLink}?client_reference_id=${giftRef.id}`;
      } else {
        alert('Payment link not found for this gift');
      }
     
    } catch (error) {
      console.error('Gift error:', error);
      alert('Error sending gift: ' + error.message);
    }
  };
});

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    if (ADMIN_EMAILS.includes(user.email)) {
      document.getElementById('adminNavBtn').style.display = 'inline-block';
    }
    loadPosts();
  }
});