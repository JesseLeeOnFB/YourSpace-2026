// feed.js - COMPLETE (navigation.js handles Firebase initialization)

// Use Firebase instances from navigation.js (already initialized)
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

// ALL 18 GIFT PAYMENT LINKS
const GIFT_PAYMENT_LINKS = {
  rose: "https://buy.stripe.com/3cIaEXg9kdE25E7g8x7bW00",
  coffee: "https://buy.stripe.com/7sY9ATf5garQaYrg8x7bW01",
  teddybear: "https://buy.stripe.com/cNi7sL2iugQed6z6xX7bW02",
  cake: "https://buy.stripe.com/14A5kD0am2Zo9UncWl7bW03",
  diamond: "https://buy.stripe.com/aFa3cvcX8bvU2rVg8x7bW04",
  yacht: "https://buy.stripe.com/eVqaEX8GS2Zo6Ib2hH7bW05",
  houses: "https://buy.stripe.com/eVq28r4qC1VkaYr5tT7bW0h",
  cars: "https://buy.stripe.com/aFacN5aP0bvUc2v3lL7bW0g",
  trucks: "https://buy.stripe.com/bJe9AT8GSczY0jN9K97bW0f",
  pets: "https://buy.stripe.com/dRmbJ1e1c0Rg6Ib9K97bW0e",
  lawn: "https://buy.stripe.com/fZucN50ambvU6Ib2hH7bW09",
  trees: "https://buy.stripe.com/28E9AT6yK2Zo3vZg8x7bW08",
  driveway: "https://buy.stripe.com/4gM7sL2iuczY0jNf4t7bW0b",
  minivan: "https://buy.stripe.com/cNi9AT6yK2Zo1nRg8x7bW0c",
  crowns: "https://buy.stripe.com/aFa14ne1c0RgfeH9K97bW0d",
  mansion: "https://buy.stripe.com/3cI5kDcX81VkgiL09z7bW0i",
  ultimatejet: "https://buy.stripe.com/bJecN59KWeI6feHcWl7bW0a",
  diamonds: "https://buy.stripe.com/00wfZh7CO7fE9Une0p7bW0j"
};

let currentGiftPost = null;
let currentGiftRecipient = null;
let currentGiftUsername = null;

// USER SEARCH
const searchBar = document.getElementById('searchBar');
const searchResults = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');
let searchTimeout;

if (searchBar) {
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
            
            const levelBadge = user.level ? `<span class="level-badge">Lv.${user.level}</span>` : '';
            
            item.innerHTML = `
              <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&size=45'}" class="search-result-avatar" alt="Avatar">
              <div>
                <span class="search-result-username">@${user.username}</span>
                ${levelBadge}
              </div>
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

  if (clearSearchBtn) {
    clearSearchBtn.onclick = () => {
      searchBar.value = '';
      searchResults.style.display = 'none';
      clearSearchBtn.style.display = 'none';
    };
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchResults.style.display = 'none';
    }
  });
}

// CREATE POST
const postBtn = document.getElementById('postBtn');
const postText = document.getElementById('postText');
const postFileInput = document.getElementById('postFileInput');

if (postBtn) {
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
        type: 'user_post',
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
}

// LOAD POSTS
async function loadPosts() {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  
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
      const post = doc.data();
      if (post.type === 'gift_announcement') {
        renderGiftPost(post, doc.id);
      } else {
        renderPost(post, doc.id);
      }
    });
   
  } catch (error) {
    console.error('Load posts error:', error);
    container.innerHTML = '<p style="text-align:center;color:red;">Error loading posts</p>';
  }
}

// RENDER GIFT POST
function renderGiftPost(post, postId) {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  
  const postDiv = document.createElement('div');
  postDiv.className = 'post-card gift-post-card';
  postDiv.id = `post-${postId}`;
  
  const timestamp = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
  
  postDiv.innerHTML = `
    <div class="gift-post-header">
      <span class="gift-post-emoji">${post.giftEmoji || '🎁'}</span>
      <span class="gift-post-title">GIFT SENT!</span>
    </div>
    <div class="gift-post-content">
      <p class="gift-post-text">
        🔥 <strong class="username-link" data-uid="${post.fromUserId}">@${post.fromUsername}</strong> 
        just sent 
        <strong class="username-link" data-uid="${post.toUserId}">@${post.toUsername}</strong> 
        a <span class="gift-name">${post.giftEmoji || '🎁'} ${post.giftName || 'Gift'}</span>!
      </p>
      <div class="gift-post-price">$${(post.giftPrice || 0).toFixed(2)}</div>
    </div>
    <div class="gift-post-footer">
      <small>${timestamp}</small>
    </div>
  `;
  
  container.appendChild(postDiv);
  
  setTimeout(() => {
    postDiv.classList.add('gift-sparkle');
  }, 100);
}

// RENDER REGULAR POST
function renderPost(post, postId) {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  
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
      <strong style="cursor:pointer;" class="username-link" data-uid="${post.userId}">${post.username}</strong>
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

// Username click handler
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('username-link')) {
    const uid = e.target.dataset.uid;
    if (uid) window.location.href = `profile.html?uid=${uid}`;
  }
});

// POST ACTIONS
document.addEventListener('click', async (e) => {
  const postId = e.target.dataset.postid;
  if (!postId) return;
 
  const userId = auth.currentUser.uid;
 
  if (e.target.classList.contains('like-btn')) {
    const postRef = db.collection('posts').doc(postId);
    const post = (await postRef.get()).data();
    if (post.likedBy?.includes(userId)) {
      await postRef.update({ likedBy: firebase.firestore.FieldValue.arrayRemove(userId) });
    } else {
      await postRef.update({ 
        likedBy: firebase.firestore.FieldValue.arrayUnion(userId),
        dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId)
      });
    }
    loadPosts();
  }
 
  if (e.target.classList.contains('dislike-btn')) {
    const postRef = db.collection('posts').doc(postId);
    const post = (await postRef.get()).data();
    if (post.dislikedBy?.includes(userId)) {
      await postRef.update({ dislikedBy: firebase.firestore.FieldValue.arrayRemove(userId) });
    } else {
      await postRef.update({ 
        dislikedBy: firebase.firestore.FieldValue.arrayUnion(userId),
        likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
      });
    }
    loadPosts();
  }
 
  if (e.target.classList.contains('comment-toggle')) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
      commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
  }
 
  if (e.target.classList.contains('share-btn')) {
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#post-${postId}`);
    alert('Link copied!');
  }
 
  if (e.target.classList.contains('gift-btn')) {
    currentGiftPost = postId;
    currentGiftRecipient = e.target.dataset.recipient;
    currentGiftUsername = e.target.dataset.username;
    const recipientName = document.getElementById('giftRecipientName');
    if (recipientName) recipientName.textContent = currentGiftUsername;
    const giftDialog = document.getElementById('giftDialog');
    if (giftDialog) giftDialog.style.display = 'flex';
  }
 
  if (e.target.classList.contains('delete-btn')) {
    if (confirm('Delete this post?')) {
      await db.collection('posts').doc(postId).delete();
      loadPosts();
    }
  }
 
  if (e.target.classList.contains('pin-btn')) {
    await db.collection('posts').doc(postId).update({ pinned: true });
    loadPosts();
  }
 
  if (e.target.classList.contains('comment-btn')) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
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
  }
});

// COMMENTS
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
  const currentUserId = auth.currentUser?.uid;
  const isOwner = comment.userId === currentUserId;
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
      <div class="comment-actions">
        ${!isReply ? `<button class="reply-btn" data-commentid="${commentId}">Reply</button>` : ''}
        ${isOwner ? `<button class="delete-comment-btn" data-commentid="${commentId}" data-postid="${postId}">Delete</button>` : ''}
      </div>
      <div class="reply-box" id="reply-box-${commentId}" style="display:none;">
        <input type="text" placeholder="Write a reply..." class="reply-input" id="reply-input-${commentId}">
        <button class="send-reply-btn" data-postid="${postId}" data-commentid="${commentId}">Send</button>
        <button class="cancel-reply-btn" data-commentid="${commentId}">Cancel</button>
      </div>
      <div class="replies" id="replies-${commentId}"></div>
    </div>
  `;
  container.appendChild(commentDiv);
  attachCommentHandlers(commentDiv, commentId, postId);
  if (!isReply) await loadReplies(postId, commentId);
}

function attachCommentHandlers(commentDiv, commentId, postId) {
  const replyBtn = commentDiv.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.onclick = () => {
      const replyBox = document.getElementById(`reply-box-${commentId}`);
      if (replyBox) replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none';
    };
  }
  const deleteBtn = commentDiv.querySelector('.delete-comment-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm('Delete comment?')) {
        await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
        loadComments(postId);
      }
    };
  }
  const sendReplyBtn = commentDiv.querySelector('.send-reply-btn');
  if (sendReplyBtn) {
    sendReplyBtn.onclick = async () => {
      const input = document.getElementById(`reply-input-${commentId}`);
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
      const username = userDoc.data()?.username || auth.currentUser.email.split('@')[0];
      await db.collection('posts').doc(postId).collection('comments').add({
        userId: auth.currentUser.uid,
        username: username,
        text: text,
        parentCommentId: commentId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      input.value = '';
      document.getElementById(`reply-box-${commentId}`).style.display = 'none';
      loadComments(postId);
    };
  }
  const cancelReplyBtn = commentDiv.querySelector('.cancel-reply-btn');
  if (cancelReplyBtn) {
    cancelReplyBtn.onclick = () => {
      document.getElementById(`reply-box-${commentId}`).style.display = 'none';
    };
  }
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

// GIFT DIALOG
const cancelGiftBtn = document.getElementById('cancelGiftBtn');
if (cancelGiftBtn) {
  cancelGiftBtn.onclick = () => {
    const giftDialog = document.getElementById('giftDialog');
    if (giftDialog) giftDialog.style.display = 'none';
  };
}

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
    const giftDialog = document.getElementById('giftDialog');
    if (giftDialog) giftDialog.style.display = 'none';
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const username = userDoc.data()?.username || user.email.split('@')[0];
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

// PAGE LOAD
window.onAuthReady = function(user) {
  loadPosts();
};