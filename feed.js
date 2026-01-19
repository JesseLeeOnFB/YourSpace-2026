// feed.js — UPDATED - Clickable usernames + Virtual Rewards System

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

// Admin accounts
const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

// Keyword filter - blocks offensive content
const BLOCKED_KEYWORDS = [
  // Racist slurs (partial list - add more as needed)
  "n***er", "n***a", "f****t", "d**e", "ch**k", "sp*c", "k**e", "r****d",
  // Threats
  "kill yourself", "kys", "kill you", "murder", "bomb threat",
  // Self-harm
  "suicide", "cut myself", "end it all", "kill myself",
  // Add more keywords as needed
];

function containsBlockedKeyword(text) {
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function haptic(type = "light") {
  if (!navigator.vibrate) return;
  if (type === "light") navigator.vibrate(10);
  if (type === "medium") navigator.vibrate(20);
  if (type === "heavy") navigator.vibrate([30, 20, 30]);
}

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// UTILITY: Navigate to user's profile
function goToUserProfile(userId) {
  window.location.href = `profile.html?userId=${userId}`;
}

// REWARDS MODAL
function showRewardsModal(postId, postOwnerId, postOwnerUsername) {
  const modal = document.createElement("div");
  modal.className = "rewards-modal";
  modal.innerHTML = `
    <div class="rewards-modal-content">
      <span class="close-rewards-modal">&times;</span>
      <h2>🎁 Send a Reward to ${postOwnerUsername}</h2>
      <p class="rewards-subtitle">Support creators with virtual rewards!</p>
      
      <div class="rewards-grid">
        <div class="reward-item" data-reward="house" data-price="9.99" data-quantity="20">
          <div class="reward-icon">🏠</div>
          <h3>20 Houses</h3>
          <p class="reward-price">$9.99</p>
          <p class="reward-value">Creator earns $2.00</p>
        </div>
        
        <div class="reward-item" data-reward="car" data-price="14.99" data-quantity="30">
          <div class="reward-icon">🚗</div>
          <h3>30 Cars</h3>
          <p class="reward-price">$14.99</p>
          <p class="reward-value">Creator earns $3.00</p>
        </div>
        
        <div class="reward-item" data-reward="truck" data-price="14.99" data-quantity="30">
          <div class="reward-icon">🚚</div>
          <h3>30 Trucks</h3>
          <p class="reward-price">$14.99</p>
          <p class="reward-value">Creator earns $3.00</p>
        </div>
        
        <div class="reward-item" data-reward="minivan" data-price="14.99" data-quantity="30">
          <div class="reward-icon">🚐</div>
          <h3>30 Mini Vans</h3>
          <p class="reward-price">$14.99</p>
          <p class="reward-value">Creator earns $3.00</p>
        </div>
        
        <div class="reward-item" data-reward="puppy" data-price="19.99" data-quantity="50">
          <div class="reward-icon">🐶</div>
          <h3>50 Puppies</h3>
          <p class="reward-price">$19.99</p>
          <p class="reward-value">Creator earns $5.00</p>
        </div>
        
        <div class="reward-item" data-reward="cat" data-price="19.99" data-quantity="50">
          <div class="reward-icon">🐱</div>
          <h3>50 Cats</h3>
          <p class="reward-price">$19.99</p>
          <p class="reward-value">Creator earns $5.00</p>
        </div>
        
        <div class="reward-item" data-reward="grass" data-price="9.99" data-quantity="20">
          <div class="reward-icon">🌱</div>
          <h3>20 Grass</h3>
          <p class="reward-price">$9.99</p>
          <p class="reward-value">Creator earns $2.00</p>
        </div>
        
        <div class="reward-item reward-item-ultimate" data-reward="jet" data-price="99.99" data-quantity="1">
          <div class="reward-icon">✈️</div>
          <h3>1 Private Jet</h3>
          <p class="reward-price">$99.99</p>
          <p class="reward-value">Creator earns $50.00</p>
          <span class="ultimate-badge">🏆 ULTIMATE</span>
        </div>
      </div>
      
      <p class="rewards-disclaimer">
        ⚠️ All purchases are non-refundable and non-transferable. Rewards support creators!
      </p>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector(".close-rewards-modal").onclick = () => {
    modal.remove();
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  modal.querySelectorAll(".reward-item").forEach(item => {
    item.onclick = async () => {
      const rewardType = item.dataset.reward;
      const price = parseFloat(item.dataset.price);
      const quantity = parseInt(item.dataset.quantity);
      
      if (confirm(`Purchase ${quantity} ${rewardType}(s) for $${price}? This will support ${postOwnerUsername}!`)) {
        await processRewardPurchase(postId, postOwnerId, rewardType, quantity, price);
        modal.remove();
      }
    };
  });
}

// PROCESS REWARD PURCHASE
async function processRewardPurchase(postId, recipientUserId, rewardType, quantity, price) {
  try {
    // In production, this would integrate with Stripe Checkout
    // For now, we'll simulate the purchase and update Firestore
    
    const currentUserId = auth.currentUser.uid;
    const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
    const currentUsername = currentUserDoc.data()?.username || "Anonymous";
    
    // Calculate creator payout (basic: $0.10 per reward, Jet: $50)
    const creatorPayout = rewardType === "jet" ? 50.00 : (quantity * 0.10);
    
    // Record reward transaction
    await addDoc(collection(db, "rewardTransactions"), {
      fromUserId: currentUserId,
      fromUsername: currentUsername,
      toUserId: recipientUserId,
      postId: postId,
      rewardType: rewardType,
      quantity: quantity,
      purchaseAmount: price,
      creatorPayout: creatorPayout,
      createdAt: serverTimestamp(),
      status: "pending" // pending → processed after 7-14 days
    });
    
    // Update recipient's rewards count
    const recipientRef = doc(db, "users", recipientUserId);
    const recipientDoc = await getDoc(recipientRef);
    
    if (!recipientDoc.exists()) {
      await setDoc(recipientRef, {
        rewards: {
          [rewardType]: quantity
        },
        totalEarned: creatorPayout,
        pendingPayout: creatorPayout
      });
    } else {
      await updateDoc(recipientRef, {
        [`rewards.${rewardType}`]: increment(quantity),
        totalEarned: increment(creatorPayout),
        pendingPayout: increment(creatorPayout)
      });
    }
    
    // Update post reward count (for trending calculation)
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      [`rewardsReceived.${rewardType}`]: increment(quantity)
    });
    
    haptic("heavy");
    alert(`✅ ${quantity} ${rewardType}(s) sent successfully! The creator will receive $${creatorPayout.toFixed(2)}`);
    
  } catch (error) {
    console.error("Error processing reward:", error);
    alert("Error processing reward. Please try again.");
  }
}

async function renderPost(post, postId) {
  const isOwner = post.userId === auth.currentUser.uid;
  const currentUserId = auth.currentUser.uid;
  const currentUserEmail = auth.currentUser.email;

  const likedBy = post.likedBy || [];
  const dislikedBy = post.dislikedBy || [];
  const userLiked = likedBy.includes(currentUserId);
  const userDisliked = dislikedBy.includes(currentUserId);
  const isPinned = post.pinned || false;
  const isTrending = post.trending || false;

  const postEl = document.createElement("div");
  postEl.className = "post-card";
  if (isPinned) postEl.classList.add("pinned-post");
  if (isTrending) postEl.classList.add("trending-post");

  const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";

  // CLICKABLE USERNAME - Now links to user profile
  postEl.innerHTML = `
    ${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''}
    ${isTrending && !isPinned ? '<div class="trending-badge">🔥 Trending Now</div>' : ''}
    <div class="post-header">
      <strong class="clickable-username" data-user-id="${post.userId}">${post.username || "Anonymous"}</strong>
      <small>${time}</small>
    </div>
    <p>${post.text || ""}</p>
    ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
    <div class="actions">
      <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button>
      <button class="reward-btn" data-id="${postId}" data-owner-id="${post.userId}" data-owner-name="${post.username}">🎁</button>
      <button class="comment-toggle" data-id="${postId}">💬</button>
      <button class="share-btn" data-id="${postId}">🔗</button>
      ${isOwner ? `<button class="delete-btn" data-id="${postId}">🗑️</button>` : ""}
      ${isAdmin(currentUserEmail) && !isPinned ? `<button class="pin-btn" data-id="${postId}">📌 Pin</button>` : ""}
      ${isAdmin(currentUserEmail) && isPinned ? `<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>` : ""}
    </div>
    <div class="comments-section" id="comments-${postId}"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="Write a comment..." />
      <button class="comment-btn" data-id="${postId}">💬</button>
    </div>
  `;

  // CLICKABLE USERNAME EVENT LISTENER
  postEl.querySelector(".clickable-username").onclick = () => {
    goToUserProfile(post.userId);
  };

  // REWARD BUTTON
  postEl.querySelector(".reward-btn").onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ownerId = e.target.dataset.ownerId;
    const ownerName = e.target.dataset.ownerName;
    showRewardsModal(postId, ownerId, ownerName);
  };

  postEl.querySelector(".like-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUserId)
      });
    } else {
      const updates = {
        likedBy: arrayUnion(currentUserId)
      };
      if (userDisliked) {
        updates.dislikedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
  };

  postEl.querySelector(".dislike-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userDisliked) {
      await updateDoc(postRef, {
        dislikedBy: arrayRemove(currentUserId)
      });
    } else {
      const updates = {
        dislikedBy: arrayUnion(currentUserId)
      };
      if (userLiked) {
        updates.likedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
  };

  postEl.querySelector(".share-btn").onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("medium");
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied!");
  };

  const deleteBtn = postEl.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      haptic("heavy");
      if (confirm("Delete this post?")) {
        try {
          await deleteDoc(doc(db, "posts", postId));
          postEl.remove();
        } catch (err) {
          alert("Error deleting post: " + err.message);
        }
      }
    });
  }

  // PIN/UNPIN BUTTON (Admin only)
  const pinBtn = postEl.querySelector(".pin-btn");
  if (pinBtn) {
    pinBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await updateDoc(doc(db, "posts", postId), { pinned: true });
        alert("Post pinned to top of feed!");
      } catch (err) {
        alert("Error pinning post: " + err.message);
      }
    });
  }

  const unpinBtn = postEl.querySelector(".unpin-btn");
  if (unpinBtn) {
    unpinBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await updateDoc(doc(db, "posts", postId), { pinned: false });
      } catch (err) {
        alert("Error unpinning post: " + err.message);
      }
    });
  }

  const commentsSection = postEl.querySelector(".comments-section");
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));

  onSnapshot(commentsQ, (snap) => {
    commentsSection.innerHTML = "";

    snap.forEach(async (cDoc) => {
      const c = cDoc.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";

      const isCommentOwner = c.userId === auth.currentUser.uid;
      const replies = c.replies || [];

      // CLICKABLE USERNAMES IN COMMENTS
      cEl.innerHTML = `
        <strong class="clickable-username" data-user-id="${c.userId}">${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        <div class="comment-actions">
          <button class="reply-btn" data-comment-id="${cDoc.id}">↩️ Reply</button>
          ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️</button>` : ""}
        </div>
        <div class="replies-container" id="replies-${cDoc.id}">
          ${replies.map(reply => `
            <div class="reply">
              <strong class="clickable-username-reply" data-user-id="${reply.userId}">${reply.username}</strong>
              <p>${reply.text}</p>
              ${reply.userId === auth.currentUser.uid ? `<button class="delete-reply" data-comment-id="${cDoc.id}" data-reply-id="${reply.id}" data-post-id="${postId}">🗑️</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="reply-form" id="reply-form-${cDoc.id}" style="display:none;">
          <input type="text" class="reply-input" placeholder="Write a reply..." />
          <button class="reply-submit-btn" data-comment-id="${cDoc.id}">Send</button>
          <button class="reply-cancel-btn" data-comment-id="${cDoc.id}">Cancel</button>
        </div>
      `;

      // CLICKABLE USERNAME IN COMMENT
      cEl.querySelector(".clickable-username").onclick = () => {
        goToUserProfile(c.userId);
      };

      // CLICKABLE USERNAMES IN REPLIES
      cEl.querySelectorAll(".clickable-username-reply").forEach(usernameEl => {
        usernameEl.onclick = () => {
          goToUserProfile(usernameEl.dataset.userId);
        };
      });

      // Reply button
      cEl.querySelector(".reply-btn").onclick = () => {
        const replyForm = document.getElementById(`reply-form-${cDoc.id}`);
        replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none";
      };

      // Submit reply
      const replySubmitBtn = cEl.querySelector(".reply-submit-btn");
      if (replySubmitBtn) {
        replySubmitBtn.onclick = async () => {
          const replyInput = cEl.querySelector(".reply-input");
          const replyText = replyInput.value.trim();
          if (!replyText) return;

          if (containsBlockedKeyword(replyText)) {
            alert("Your reply contains blocked content and cannot be posted.");
            return;
          }

          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          const userData = userDoc.data();

          const newReply = {
            id: Date.now().toString(),
            userId: auth.currentUser.uid,
            username: userData?.username || auth.currentUser.email.split("@")[0],
            text: replyText,
            createdAt: new Date().toISOString()
          };

          const commentRef = doc(db, "posts", postId, "comments", cDoc.id);
          const commentDoc = await getDoc(commentRef);
          const existingReplies = commentDoc.data().replies || [];

          await updateDoc(commentRef, {
            replies: [...existingReplies, newReply]
          });

          replyInput.value = "";
          document.getElementById(`reply-form-${cDoc.id}`).style.display = "none";
        };
      }

      // Cancel reply
      const replyCancelBtn = cEl.querySelector(".reply-cancel-btn");
      if (replyCancelBtn) {
        replyCancelBtn.onclick = () => {
          document.getElementById(`reply-form-${cDoc.id}`).style.display = "none";
        };
      }

      // Delete comment
      const deleteCommentBtn = cEl.querySelector(".delete-comment");
      if (deleteCommentBtn) {
        deleteCommentBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          haptic("heavy");
          if (confirm("Delete this comment?")) {
            const commentId = e.target.getAttribute("data-comment-id");
            const postIdForComment = e.target.getAttribute("data-post-id");
            try {
              await deleteDoc(doc(db, "posts", postIdForComment, "comments", commentId));
            } catch (err) {
              alert("Error deleting comment: " + err.message);
            }
          }
        });
      }

      // Delete reply buttons
      cEl.querySelectorAll(".delete-reply").forEach(btn => {
        btn.onclick = async (e) => {
          if (confirm("Delete this reply?")) {
            const commentId = e.target.getAttribute("data-comment-id");
            const replyId = e.target.getAttribute("data-reply-id");
            const postIdForReply = e.target.getAttribute("data-post-id");

            const commentRef = doc(db, "posts", postIdForReply, "comments", commentId);
            const commentDoc = await getDoc(commentRef);
            const existingReplies = commentDoc.data().replies || [];
            const updatedReplies = existingReplies.filter(r => r.id !== replyId);

            await updateDoc(commentRef, {
              replies: updatedReplies
            });
          }
        };
      });

      commentsSection.appendChild(cEl);
    });
  });

  postEl.querySelector(".comment-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const input = postEl.querySelector(".comment-input");
    const text = input.value.trim();
    if (!text) return;

    // KEYWORD FILTER - Block offensive comments
    if (containsBlockedKeyword(text)) {
      alert("Your comment contains blocked content and cannot be posted. Please remove offensive language.");
      return;
    }

    haptic("medium");

    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userDoc.data();
    const username = userData?.username || auth.currentUser.email.split("@")[0];

    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text,
        userId: auth.currentUser.uid,
        username: username,
        createdAt: serverTimestamp()
      });

      input.value = "";
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  };

  postsContainer.appendChild(postEl);
}

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    postsContainer.innerHTML = "";
    
    // Separate pinned, trending, and regular posts
    const pinnedPosts = [];
    const trendingPosts = [];
    const regularPosts = [];
    
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      if (post.pinned) {
        pinnedPosts.push({ data: post, id: docSnap.id });
      } else if (post.trending) {
        trendingPosts.push({ data: post, id: docSnap.id });
      } else {
        regularPosts.push({ data: post, id: docSnap.id });
      }
    });
    
    // Render in order: Pinned → Trending → Regular
    pinnedPosts.forEach(({ data, id }) => renderPost(data, id));
    trendingPosts.forEach(({ data, id }) => renderPost(data, id));
    regularPosts.forEach(({ data, id }) => renderPost(data, id));
  });
}

postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  // KEYWORD FILTER - Block offensive posts
  if (containsBlockedKeyword(text)) {
    alert("Your post contains blocked content and cannot be published. Please remove offensive language.");
    return;
  }

  let mediaURL = "";
  let mediaType = "";

  if (file) {
    mediaType = file.type.startsWith("video") ? "video" : "image";
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = userDoc.data();
  const username = userData?.username || auth.currentUser.email.split("@")[0];

  try {
    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      username: username,
      text,
      mediaURL,
      mediaType,
      likedBy: [],
      dislikedBy: [],
      rewardsReceived: {},
      pinned: false,
      createdAt: serverTimestamp()
    });

    haptic("medium");

    postText.value = "";
    postFileInput.value = "";
  } catch (err) {
    alert("Error creating post: " + err.message);
  }
});

auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "login.html";
  else loadPosts();
});
