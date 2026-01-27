// feed.js - COMPLETELY FIXED VERSION
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
// USER SEARCH
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
      // Search using startAt/endAt for prefix matching
      const usersSnapshot = await db.collection('users')
        .orderBy('username')
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff')
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
 
  postDiv.innerHTML = `
    <div class="post-header">
      <strong class="post-username" data-uid="${post.userId}">${post.username}</strong>
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
      <button class="dislike-btn ${isDisliked ? 'active' : ''}" data-postid="${postId}">🖕 ${dislikeCount}</button>
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
  
  // Add click handler for username
  postDiv.querySelector('.post-username').addEventListener('click', function() {
    const uid = this.dataset.uid;
    window.location.href = `profile.html?uid=${uid}`;
  });
  
  loadComments(postId);
}

// ═══════════════════════════════════════════════════════════
// POST ACTIONS - Using Event Delegation
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', async (e) => {
  const target = e.target;
  
  // LIKE BUTTON
  if (target.classList.contains('like-btn')) {
    const postId = target.dataset.postid;
    const userId = auth.currentUser.uid;
    
    try {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
     
      if (post.likedBy?.includes(userId)) {
        await postRef.update({
          likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      } else {
        await postRef.update({
          likedBy: firebase.firestore.FieldValue.arrayUnion(userId),
          dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      }
      loadPosts();
    } catch (error) {
      console.error('Like error:', error);
    }
    return;
  }
  
  // DISLIKE BUTTON
  if (target.classList.contains('dislike-btn')) {
    const postId = target.dataset.postid;
    const userId = auth.currentUser.uid;
    
    try {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
     
      if (post.dislikedBy?.includes(userId)) {
        await postRef.update({
          dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      } else {
        await postRef.update({
          dislikedBy: firebase.firestore.FieldValue.arrayUnion(userId),
          likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      }
      loadPosts();
    } catch (error) {
      console.error('Dislike error:', error);
    }
    return;
  }
  
  // COMMENT TOGGLE
  if (target.classList.contains('comment-toggle')) {
    const postId = target.dataset.postid;
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    return;
  }
  
  // SHARE
  if (target.classList.contains('share-btn')) {
    const postId = target.dataset.postid;
    const url = `${window.location.origin}/feed.html#post-${postId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
    return;
  }
  
  // GIFT
  if (target.classList.contains('gift-btn')) {
    currentGiftPost = target.dataset.postid;
    currentGiftRecipient = target.dataset.recipient;
    currentGiftUsername = target.dataset.username;
    document.getElementById('giftRecipientName').textContent = currentGiftUsername;
    document.getElementById('giftDialog').style.display = 'flex';
    return;
  }
  
  // DELETE
  if (target.classList.contains('delete-btn')) {
    const postId = target.dataset.postid;
    if (confirm('Delete this post?')) {
      await db.collection('posts').doc(postId).delete();
      loadPosts();
    }
    return;
  }
  
  // PIN
  if (target.classList.contains('pin-btn')) {
    const postId = target.dataset.postid;
    await db.collection('posts').doc(postId).update({ pinned: true });
    loadPosts();
    return;
  }
  
  // COMMENT SEND
  if (target.classList.contains('comment-btn')) {
    const postId = target.dataset.postid;
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;
   
    const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
    const username = userDoc.data()?.username || auth.currentUser.email.split('@')[0];
   
    await db.collection('posts').doc(postId).collection('comments').add({
      userId: auth.currentUser.uid,
      username: username,
      text: text,
      parentCommentId: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
   
    input.value = '';
    loadComments(postId);
    return;
  }
  
  // REPLY BUTTON
  if (target.classList.contains('reply-btn')) {
    const commentId = target.dataset.commentid;
    const replyBox = document.getElementById(`reply-box-${commentId}`);
    replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none';
    return;
  }
  
  // SEND REPLY
  if (target.classList.contains('send-reply-btn')) {
    const postId = target.dataset.postid;
    const parentCommentId = target.dataset.commentid;
    const input = document.getElementById(`reply-input-${parentCommentId}`);
    const text = input.value.trim();
    if (!text) return;
    
    const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
    const username = userDoc.data()?.username || auth.currentUser.email.split('@')[0];
    
    await db.collection('posts').doc(postId).collection('comments').add({
      userId: auth.currentUser.uid,
      username: username,
      text: text,
      parentCommentId: parentCommentId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    input.value = '';
    document.getElementById(`reply-box-${parentCommentId}`).style.display = 'none';
    loadComments(postId);
    return;
  }
  
  // CANCEL REPLY
  if (target.classList.contains('cancel-reply-btn')) {
    const commentId = target.dataset.commentid;
    document.getElementById(`reply-box-${commentId}`).style.display = 'none';
    return;
  }
  
  // DELETE COMMENT
  if (target.classList.contains('delete-comment')) {
    const postId = target.dataset.postid;
    const commentId = target.dataset.commentid;
    if (confirm('Delete this comment?')) {
      await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
      loadComments(postId);
    }
    return;
  }
});

// ═══════════════════════════════════════════════════════════
// COMMENTS with NESTED REPLIES
// ═══════════════════════════════════════════════════════════
async function loadComments(postId) {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  if (!commentsList) return;
 
  try {
    const snapshot = await db.collection('posts').doc(postId)
      .collection('comments')
      .where('parentCommentId', '==', null)
      .orderBy('createdAt', 'asc')
      .get();
   
    commentsList.innerHTML = '';
   
    if (snapshot.empty) {
      commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
      return;
    }
   
    for (const doc of snapshot.docs) {
      await renderComment(doc.data(), doc.id, postId, commentsList, false);
    }
   
  } catch (error) {
    console.error('Load comments error:', error);
  }
}

async function renderComment(comment, commentId, postId, container, isReply) {
  const commentDiv = document.createElement('div');
  commentDiv.className = 'comment-thread';
  if (isReply) commentDiv.style.marginLeft = '40px';
 
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
      <button class="reply-btn" data-commentid="${commentId}">Reply</button>
      ${isOwner ? `<button class="delete-comment" data-commentid="${commentId}" data-postid="${postId}">Delete</button>` : ''}
      <div class="reply-box" id="reply-box-${commentId}" style="display:none;">
        <input type="text" placeholder="Write a reply..." id="reply-input-${commentId}">
        <button class="send-reply-btn" data-postid="${postId}" data-commentid="${commentId}">Send</button>
        <button class="cancel-reply-btn" data-commentid="${commentId}">Cancel</button>
      </div>
      <div class="replies" id="replies-${commentId}"></div>
    </div>
  `;
 
  container.appendChild(commentDiv);
  
  // Load replies
  await loadReplies(postId, commentId);
}

async function loadReplies(postId, parentCommentId) {
  const repliesContainer = document.getElementById(`replies-${parentCommentId}`);
  if (!repliesContainer) return;
  
  try {
    const snapshot = await db.collection('posts').doc(postId)
      .collection('comments')
      .where('parentCommentId', '==', parentCommentId)
      .orderBy('createdAt', 'asc')
      .get();
    
    for (const doc of snapshot.docs) {
      await renderComment(doc.data(), doc.id, postId, repliesContainer, true);
    }
  } catch (error) {
    console.error('Load replies error:', error);
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
     
      await db.collection('pendingGifts').add({
        senderId: user.uid,
        senderName: username,
        senderEmail: user.email,
        recipientId: currentGiftRecipient,
        recipientName: currentGiftUsername,
        postId: currentGiftPost,
        giftType: giftType,
        status: 'pending',
        createdAt: firebase.firestore.Timestamp.now()
      });
     
      await new Promise(resolve => setTimeout(resolve, 500));
     
      const paymentLink = GIFT_PAYMENT_LINKS[giftType];
      if (paymentLink) {
        window.location.href = paymentLink;
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