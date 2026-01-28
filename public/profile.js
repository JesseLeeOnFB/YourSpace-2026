// profile.js - COMPLETE WITH NUCLEAR IMAGE SIZE FIX

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, query, getDocs, setDoc, onSnapshot, orderBy, serverTimestamp, addDoc, deleteDoc, where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser;
let viewingUserId;
let isOwnProfile = true;

const urlParams = new URLSearchParams(window.location.search);
viewingUserId = urlParams.get('uid') || urlParams.get('userId');

// ═══════════════════════════════════════════════════════════
// NUCLEAR IMAGE SIZE FIX FUNCTION
// ═══════════════════════════════════════════════════════════
function forceCorrectImageSizes() {
  console.log('🔧 Forcing correct image sizes...');
  
  // Fix profile picture with MAXIMUM specificity
  const profilePics = document.querySelectorAll('#profilePic, .profile-picture, .profile-pic, .profile-avatar, .profile-header img, .profile-top img, .pfp-container img');
  profilePics.forEach(img => {
    img.style.cssText = `
      max-width: 150px !important;
      max-height: 150px !important;
      width: 150px !important;
      height: 150px !important;
      min-width: 150px !important;
      min-height: 150px !important;
      object-fit: cover !important;
      border-radius: 50% !important;
      display: block !important;
      margin: 0 auto !important;
    `;
    console.log('✅ Fixed profile picture:', img.src);
  });
  
  // Fix profile picture containers
  const containers = document.querySelectorAll('.pfp-container, .profile-pic-container, .profile-picture-container');
  containers.forEach(container => {
    container.style.cssText = `
      max-width: 150px !important;
      max-height: 150px !important;
      width: 150px !important;
      height: 150px !important;
      overflow: hidden !important;
      border-radius: 50% !important;
      margin: 0 auto !important;
    `;
  });
  
  // Fix wall comment avatars
  const avatars = document.querySelectorAll('.wall-comment-avatar, .comment-avatar, .comment-header img');
  avatars.forEach(img => {
    if (!img.classList.contains('wall-comment-media') && !img.classList.contains('comment-media')) {
      img.style.cssText = `
        max-width: 40px !important;
        max-height: 40px !important;
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        min-height: 40px !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        display: inline-block !important;
      `;
    }
  });
  
  // Fix wall comment media
  const media = document.querySelectorAll('.wall-comment-media, .comment-media');
  media.forEach(img => {
    img.style.cssText = `
      max-width: 300px !important;
      max-height: 300px !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      border-radius: 8px !important;
      margin-top: 8px !important;
    `;
  });
  
  console.log('✅ Image size fix complete!');
}

// Run on page load
window.addEventListener('load', () => {
  forceCorrectImageSizes();
  // Run again after a delay to catch lazy-loaded images
  setTimeout(forceCorrectImageSizes, 1000);
  setTimeout(forceCorrectImageSizes, 2000);
});

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', forceCorrectImageSizes);

// Observer to catch dynamically added images
const imageObserver = new MutationObserver((mutations) => {
  let needsUpdate = false;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === 'IMG' || (node.querySelectorAll && node.querySelectorAll('img').length > 0)) {
        needsUpdate = true;
      }
    });
  });
  if (needsUpdate) {
    setTimeout(forceCorrectImageSizes, 100);
  }
});

imageObserver.observe(document.body, { childList: true, subtree: true });

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
document.getElementById("homeBtn")?.addEventListener('click', () => window.location.href = "feed.html");
document.getElementById("profileBtn")?.addEventListener('click', () => window.location.href = "profile.html");
document.getElementById("messagesBtn")?.addEventListener('click', () => window.location.href = "messages.html");
document.getElementById("logoutBtn")?.addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// ═══════════════════════════════════════════════════════════
// LOAD PROFILE
// ═══════════════════════════════════════════════════════════
async function loadProfile(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      document.getElementById('displayName').textContent = 'User not found';
      return;
    }
    
    const userData = userDoc.data();
    
    // Display name
    document.getElementById('displayName').textContent = userData.username || 'Anonymous';
    
    // Location
    if (userData.location) {
      document.getElementById('location').textContent = `📍 ${userData.location}`;
    }
    
    // Bio
    if (userData.bio) {
      document.getElementById('bio').textContent = userData.bio;
    }
    
    // Profile picture with fallback
    const profilePic = document.getElementById('profilePic');
    if (userData.photoURL) {
      profilePic.src = userData.photoURL;
    } else {
      // Use ui-avatars.com as fallback
      const fallbackURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&size=150&background=667eea&color=fff&bold=true`;
      profilePic.src = fallbackURL;
    }
    
    // FORCE image size after setting src
    setTimeout(forceCorrectImageSizes, 100);
    profilePic.onload = forceCorrectImageSizes;
    
    // Show/hide edit button
    if (isOwnProfile) {
      document.getElementById('editProfileBtn').style.display = 'inline-block';
      document.getElementById('sendMessageBtn').style.display = 'none';
    } else {
      document.getElementById('editProfileBtn').style.display = 'none';
      document.getElementById('sendMessageBtn').style.display = 'inline-block';
    }
    
    // Load badges
    await calculateAndDisplayBadges(userId);
    
    // Load wall comments
    await loadWallComments(userId);
    
    // Apply theme
    if (userData.theme) {
      document.body.className = userData.theme;
    }
    
    // Force image sizes one more time
    setTimeout(forceCorrectImageSizes, 500);
    
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// CALCULATE BADGES - FIXED
// ═══════════════════════════════════════════════════════════
async function calculateAndDisplayBadges(userId) {
  try {
    const badges = [];
    
    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    // Influencer badge (100+ followers)
    if (userData?.followers?.length >= 100) {
      badges.push({ icon: '⭐', name: 'Influencer', description: '100+ followers' });
    }
    
    // Content Creator badge (50+ posts) - FIXED: Added collection query
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    const postsSnapshot = await getDocs(postsQuery);
    
    if (postsSnapshot.size >= 50) {
      badges.push({ icon: '📝', name: 'Content Creator', description: '50+ posts' });
    }
    
    // Popular badge (1000+ total likes)
    let totalLikes = 0;
    postsSnapshot.forEach(doc => {
      totalLikes += (doc.data().likedBy?.length || 0);
    });
    
    if (totalLikes >= 1000) {
      badges.push({ icon: '🔥', name: 'Popular', description: '1000+ likes' });
    }
    
    // Early Adopter badge
    const joinDate = userData?.createdAt?.toDate();
    const launchDate = new Date('2026-01-01');
    if (joinDate && joinDate <= new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      badges.push({ icon: '🚀', name: 'Early Adopter', description: 'Joined in first month' });
    }
    
    // Verified badge (admin)
    const ADMIN_EMAILS = ['skeeterjeeter8@gmail.com', 'daniellehunt01@gmail.com'];
    if (ADMIN_EMAILS.includes(userData?.email)) {
      badges.push({ icon: '✓', name: 'Verified', description: 'Verified account' });
    }
    
    // Display badges
    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer) {
      if (badges.length === 0) {
        badgesContainer.innerHTML = '<p style="opacity: 0.6;">No badges yet</p>';
      } else {
        badgesContainer.innerHTML = badges.map(badge => `
          <div class="badge" title="${badge.description}">
            <span class="badge-icon">${badge.icon}</span>
            <span class="badge-name">${badge.name}</span>
          </div>
        `).join('');
      }
    }
    
  } catch (error) {
    console.error('Error calculating badges:', error);
    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer) {
      badgesContainer.innerHTML = '<p style="opacity: 0.6;">Unable to load badges</p>';
    }
  }
}

// ═══════════════════════════════════════════════════════════
// WALL COMMENTS - FIXED
// ═══════════════════════════════════════════════════════════
async function loadWallComments(userId) {
  const commentsContainer = document.getElementById('wall-comments-container');
  if (!commentsContainer) return;
  
  try {
    const commentsQuery = query(
      collection(db, 'users', userId, 'wallComments'),
      orderBy('createdAt', 'desc')
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    
    if (commentsSnapshot.empty) {
      commentsContainer.innerHTML = '<p style="text-align:center;opacity:0.6;">No comments yet. Be the first!</p>';
      return;
    }
    
    commentsContainer.innerHTML = '';
    
    commentsSnapshot.forEach(commentDoc => {
      const comment = commentDoc.data();
      const commentDiv = document.createElement('div');
      commentDiv.className = 'wall-comment';
      
      const timestamp = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Just now';
      const isOwner = comment.userId === currentUser?.uid;
      
      // Avatar with fallback
      const avatarURL = comment.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username || 'User')}&size=40&background=random`;
      
      commentDiv.innerHTML = `
        <div class="comment-header">
          <img src="${avatarURL}" class="comment-avatar wall-comment-avatar" alt="Avatar">
          <div>
            <strong>${comment.username || 'Anonymous'}</strong>
            <small style="opacity:0.7; display:block;">${timestamp}</small>
          </div>
        </div>
        <p class="comment-text">${comment.text || ''}</p>
        ${comment.mediaURL ? `
          <img src="${comment.mediaURL}" class="wall-comment-media comment-media" alt="Comment media">
        ` : ''}
        ${isOwner || userId === currentUser?.uid ? `
          <button class="delete-wall-comment" data-commentid="${commentDoc.id}" data-userid="${userId}">Delete</button>
        ` : ''}
      `;
      
      commentsContainer.appendChild(commentDiv);
    });
    
    // Attach delete handlers
    document.querySelectorAll('.delete-wall-comment').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this comment?')) {
          const commentId = btn.dataset.commentid;
          const userId = btn.dataset.userid;
          await deleteDoc(doc(db, 'users', userId, 'wallComments', commentId));
          loadWallComments(userId);
        }
      };
    });
    
    // Force image sizes after loading comments
    setTimeout(forceCorrectImageSizes, 200);
    
  } catch (error) {
    console.error('Error loading wall comments:', error);
    commentsContainer.innerHTML = '<p style="color:red;">Error loading comments</p>';
  }
}

// Post wall comment
document.getElementById('postWallCommentBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('wallCommentInput');
  const text = input?.value.trim();
  
  if (!text) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const username = userDoc.data()?.username || currentUser.email.split('@')[0];
    const photoURL = userDoc.data()?.photoURL;
    
    await addDoc(collection(db, 'users', viewingUserId, 'wallComments'), {
      userId: currentUser.uid,
      username: username,
      userPhotoURL: photoURL,
      text: text,
      createdAt: serverTimestamp()
    });
    
    input.value = '';
    loadWallComments(viewingUserId);
    
  } catch (error) {
    console.error('Error posting comment:', error);
    alert('Error posting comment');
  }
});

// ═══════════════════════════════════════════════════════════
// PROFILE PICTURE UPLOAD
// ═══════════════════════════════════════════════════════════
document.getElementById('changePfpBtn')?.addEventListener('click', () => {
  document.getElementById('profilePicInput').click();
});

document.getElementById('profilePicInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const uploadBtn = document.getElementById('changePfpBtn');
  uploadBtn.textContent = 'Uploading...';
  uploadBtn.disabled = true;
  
  try {
    const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        uploadBtn.textContent = `${Math.round(progress)}%`;
      },
      (error) => {
        console.error('Upload error:', error);
        alert('Upload failed');
        uploadBtn.textContent = 'Change Picture';
        uploadBtn.disabled = false;
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: downloadURL
        });
        
        document.getElementById('profilePic').src = downloadURL;
        uploadBtn.textContent = 'Change Picture';
        uploadBtn.disabled = false;
        
        // Force image size after upload
        setTimeout(forceCorrectImageSizes, 100);
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed');
    uploadBtn.textContent = 'Change Picture';
    uploadBtn.disabled = false;
  }
});

// ═══════════════════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    if (!viewingUserId) {
      viewingUserId = user.uid;
      isOwnProfile = true;
    } else {
      isOwnProfile = (viewingUserId === user.uid);
    }
    loadProfile(viewingUserId);
  }
});