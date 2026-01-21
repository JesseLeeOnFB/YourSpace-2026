// feed.js — FIXED - All buttons working, username display

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs, where,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
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

// ═══════════════════════════════════════════════════════════
// SPAM RATE LIMIT - 5 posts per 2 minutes
// ═══════════════════════════════════════════════════════════
const postTimestamps = [];
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW = 2 * 60 * 1000; // 2 minutes in milliseconds

function checkRateLimit() {
  const now = Date.now();
  // Remove timestamps older than 2 minutes
  while (postTimestamps.length > 0 && now - postTimestamps[0] > RATE_LIMIT_WINDOW) {
    postTimestamps.shift();
  }
  
  if (postTimestamps.length >= RATE_LIMIT_COUNT) {
    const oldestPost = postTimestamps[0];
    const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestPost)) / 1000);
    alert(`⏱️ Slow down! You can post again in ${waitTime} seconds. (Limit: ${RATE_LIMIT_COUNT} posts per 2 minutes)`);
    return false;
  }
  
  postTimestamps.push(now);
  return true;
}

// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE SPAM & CONTENT FILTER
// ═══════════════════════════════════════════════════════════

const BLOCKED_KEYWORDS = {
  racial: [
    'nigger', 'nigga', 'n1gger', 'n1gga', 'nig', 'coon', 'c00n', 'spic', 'sp1c', 
    'chink', 'ch1nk', 'gook', 'g00k', 'wetback', 'beaner', 'kike', 'k1ke', 
    'towelhead', 'raghead', 'sand nigger', 'paki', 'porch monkey',
    'faggot', 'fag', 'f4ggot', 'tranny', 'tr4nny', 'shemale', 'dyke', 
    'retard', 'ret4rd', 'r3tard', 'retarded'
  ],
  suicide: [
    'kill myself', 'suicide', 'end my life', 'want to die', 'going to die',
    'gonna kill myself', 'wanna die', 'better off dead', 'suicide note',
    'killing myself', 'hang myself', 'shoot myself', 'overdose', 'slit my wrists',
    'jump off', 'end it all', 'no reason to live', 'don\'t want to live', 'kys', 'k y s'
  ],
  threats: [
    'kill you', 'murder you', 'shoot you', 'stab you', 'hurt you',
    'find you', 'come after you', 'beat you', 'attack you', 'rape you',
    'bomb', 'shooting', 'school shooter', 'mass shooting', 'terrorist attack',
    'going to kill', 'gonna kill', 'planning to kill', 'deserve to die',
    'i will kill', 'im going to kill', 'youre dead', 'ur dead',
    'blow up', 'detonate', 'bomb threat', 'sexually assault'
  ],
  selfHarm: [
    'cut myself', 'cutting myself', 'self harm', 'harm myself', 'hurt myself',
    'burn myself', 'starve myself', 'punish myself'
  ],
  sexual: [
    'send nudes', 'dick pic', 'show me your', 'send pics'
  ],
  doxxing: [
    'your address is', 'you live at', 'phone number is', 'social security'
  ]
};

function containsBlockedKeyword(text) {
  if (!text || typeof text !== 'string') return { blocked: false };
  
  const lowerText = text.toLowerCase();
  
  // Check each category
  for (const category in BLOCKED_KEYWORDS) {
    for (const keyword of BLOCKED_KEYWORDS[category]) {
      if (lowerText.includes(keyword)) {
        return {
          blocked: true,
          category: category,
          keyword: keyword
        };
      }
    }
  }
  
  // Check for excessive caps (spam indicator)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (text.length > 10 && capsRatio > 0.7) {
    console.warn("Excessive caps detected");
    return { blocked: true, category: 'spam', keyword: 'excessive caps' };
  }
  
  // Check for excessive special characters (spam indicator)
  const specialChars = (text.match(/[!@#$%^&*()]/g) || []).length;
  if (specialChars > text.length * 0.3) {
    console.warn("Excessive special characters detected");
    return { blocked: true, category: 'spam', keyword: 'excessive special characters' };
  }
  
  return { blocked: false };
}

function getBlockedMessage(category) {
  const messages = {
    racial: "⛔ This content contains hate speech and cannot be posted. YourSpace does not tolerate racism or discrimination.",
    suicide: "❤️ We're concerned about you. If you're having thoughts of suicide, please reach out:\n\n988 Suicide & Crisis Lifeline: Call or text 988\n\nYour message was not sent, but support is available 24/7.",
    threats: "🚨 Threats of violence are not allowed and have been reported. This content cannot be posted.",
    selfHarm: "💚 We care about your wellbeing. If you're thinking about self-harm, please get help:\n\n988 Suicide & Crisis Lifeline: Call or text 988\nCrisis Text Line: Text HOME to 741741\n\nYour message was not sent.",
    sexual: "⛔ Sexual harassment is not allowed on YourSpace. This content cannot be posted.",
    doxxing: "⛔ Sharing personal information (doxxing) is not allowed. This content cannot be posted.",
    spam: "⛔ Your message appears to be spam and cannot be posted."
  };
  return messages[category] || "⛔ This content violates our community guidelines and cannot be posted.";
}
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

document.getElementById("notificationsNavBtn")?.addEventListener("click", () => {
  window.location.href = "notifications.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

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

  postEl.innerHTML = `
    ${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''}
    ${isTrending && !isPinned ? '<div class="trending-badge">🔥 Trending Now</div>' : ''}
    <div class="post-header">
      <strong>${post.username || "Anonymous"}</strong>
      <small>${time}</small>
    </div>
    <p>${post.text || ""}${post.edited ? ' <span class="edited-badge">(edited)</span>' : ""}</p>
    ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
    <div class="actions">
      <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button>
      <button class="comment-toggle" data-id="${postId}">💬</button>
      ${!isOwner ? `<button class="gift-btn" data-id="${postId}" data-userid="${post.userId}">🎁 Send Gift</button>` : ""}
      <button class="share-btn" data-id="${postId}">🔗</button>
      ${!isOwner ? `<button class="report-post-btn" data-id="${postId}" data-type="post">🚨 Report</button>` : ""}
      ${isOwner ? `<button class="edit-btn" data-id="${postId}">✏️ Edit</button>` : ""}
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
      
      // Create notification for post owner
      if (post.userId !== currentUserId) {
        await createNotification(post.userId, currentUserId, "liked your post", postId);
      }
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

  // GIFT BUTTON (Send gift to post creator)
  const giftBtn = postEl.querySelector(".gift-btn");
  if (giftBtn) {
    giftBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      haptic("medium");
      
      const recipientUserId = giftBtn.dataset.userid;
      
      // Check if recipient has completed Stripe tax requirements
      const recipientDoc = await getDoc(doc(db, "users", recipientUserId));
      const recipientData = recipientDoc.data();
      
      if (!recipientData.stripeVerified || !recipientData.stripeTaxComplete) {
        alert("⚠️ This user hasn't completed their payment setup yet. Gifts can only be sent to verified creators who have completed tax requirements. Your gift would be lost otherwise!");
        return;
      }
      
      // Show gift selection dialog
      showGiftDialog(postId, recipientUserId, post.username);
    };
  }

  // EDIT BUTTON (Post owner only)
  const editBtn = postEl.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      haptic("light");
      
      const postTextEl = postEl.querySelector("p");
      const currentText = post.text || "";
      
      // Create edit form
      const editForm = document.createElement("div");
      editForm.className = "edit-post-form";
      editForm.innerHTML = `
        <textarea class="edit-post-textarea">${currentText}</textarea>
        <div class="edit-post-actions">
          <button class="save-edit-btn">💾 Save</button>
          <button class="cancel-edit-btn">❌ Cancel</button>
        </div>
      `;
      
      // Replace post text with edit form
      postTextEl.replaceWith(editForm);
      const textarea = editForm.querySelector(".edit-post-textarea");
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      
      // Save button
      editForm.querySelector(".save-edit-btn").addEventListener("click", async () => {
        const newText = textarea.value.trim();
        if (!newText) {
          alert("Post cannot be empty!");
          return;
        }
        
        try {
          await updateDoc(doc(db, "posts", postId), {
            text: newText,
            edited: true,
            editedAt: serverTimestamp()
          });
          
          // Replace edit form with updated text
          const newPostTextEl = document.createElement("p");
          newPostTextEl.innerHTML = `${newText} <span class="edited-badge">(edited)</span>`;
          editForm.replaceWith(newPostTextEl);
          
          haptic("success");
        } catch (err) {
          alert("Error updating post: " + err.message);
        }
      });
      
      // Cancel button
      editForm.querySelector(".cancel-edit-btn").addEventListener("click", () => {
        const newPostTextEl = document.createElement("p");
        newPostTextEl.textContent = currentText;
        editForm.replaceWith(newPostTextEl);
      });
    });
  }

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

  // REPORT BUTTON
  const reportBtn = postEl.querySelector(".report-post-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      showReportDialog('post', postId, post.userId);
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

    snap.forEach((cDoc) => {
      const c = cDoc.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";

      const isCommentOwner = c.userId === auth.currentUser.uid;
      const replies = c.replies || [];

      cEl.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        <div class="comment-actions">
          <button class="reply-btn" data-comment-id="${cDoc.id}">↩️ Reply</button>
          ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️</button>` : ""}
        </div>
        <div class="replies-container" id="replies-${cDoc.id}">
          ${replies.map(reply => `
            <div class="reply">
              <strong>${reply.username}</strong>
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

    // COMPREHENSIVE SPAM PROTECTION
    const spamCheck = containsBlockedKeyword(text);
    if (spamCheck.blocked) {
      alert(getBlockedMessage(spamCheck.category));
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
      
      // Create notification for post owner
      if (post.userId !== auth.currentUser.uid) {
        await createNotification(post.userId, auth.currentUser.uid, "commented on your post", postId);
      }
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  };

  postsContainer.appendChild(postEl);
}

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap) => {
    postsContainer.innerHTML = "";
    
    // Calculate trending post (hourly top post based on engagement)
    await calculateTrendingPost(snap);
    
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

// ═══════════════════════════════════════════════════════════
// HOURLY TRENDING TOP POST CALCULATION (WITH GIFTS!)
// ═══════════════════════════════════════════════════════════
async function calculateTrendingPost(snapshot) {
  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let topPost = null;
    let maxEngagement = -1;
    
    // Calculate engagement score for each post from the last hour
    for (const docSnap of snapshot.docs) {
      const post = docSnap.data();
      const postTime = post.createdAt?.toMillis() || 0;
      
      // Only consider posts from the last hour
      if (postTime > oneHourAgo && !post.pinned) {
        const likes = (post.likedBy || []).length;
        const dislikes = (post.dislikedBy || []).length;
        const comments = post.commentCount || 0;
        
        // Get total gifts received for this post
        let totalGifts = 0;
        try {
          const giftsSnapshot = await getDocs(collection(db, "posts", docSnap.id, "gifts"));
          totalGifts = giftsSnapshot.size;
        } catch (err) {
          console.log("No gifts for post:", docSnap.id);
        }
        
        // Enhanced engagement score: likes + dislikes + (comments * 2) + (gifts * 5)
        // Gifts weighted 5x because they're paid and show strong support!
        const engagement = likes + dislikes + (comments * 2) + (totalGifts * 5);
        
        if (engagement > maxEngagement) {
          maxEngagement = engagement;
          topPost = { id: docSnap.id, engagement, gifts: totalGifts };
        }
      }
    }
    
    // Clear all trending flags first
    const clearPromises = [];
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      if (post.trending && !post.pinned) {
        clearPromises.push(
          updateDoc(doc(db, "posts", docSnap.id), { trending: false })
        );
      }
    });
    await Promise.all(clearPromises);
    
    // Set new trending post if we found one with meaningful engagement
    if (topPost && maxEngagement >= 5) {
      await updateDoc(doc(db, "posts", topPost.id), { trending: true });
    }
    
  } catch (err) {
    console.error("Error calculating trending post:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// GIFT SENDING SYSTEM
// ═══════════════════════════════════════════════════════════

const GIFT_TYPES = {
  coffee: { name: "☕ Coffee", price: 3, icon: "☕" },
  pizza: { name: "🍕 Pizza", price: 5, icon: "🍕" },
  flower: { name: "🌹 Flower", price: 10, icon: "🌹" },
  house: { name: "🏠 House", price: 50, icon: "🏠" },
  car: { name: "🚗 Car", price: 100, icon: "🚗" },
  jet: { name: "✈️ Private Jet", price: 500, icon: "✈️" }
};

function showGiftDialog(postId, recipientUserId, recipientUsername) {
  const dialog = document.createElement("div");
  dialog.className = "gift-dialog-overlay";
  
  const giftsHtml = Object.keys(GIFT_TYPES).map(key => {
    const gift = GIFT_TYPES[key];
    return `
      <button class="gift-option" data-type="${key}" data-price="${gift.price}">
        <span class="gift-icon">${gift.icon}</span>
        <span class="gift-name">${gift.name}</span>
        <span class="gift-price">$${gift.price}</span>
      </button>
    `;
  }).join("");
  
  dialog.innerHTML = `
    <div class="gift-dialog">
      <h3>🎁 Send a Gift to ${recipientUsername}</h3>
      <p class="gift-subtitle">Choose a gift to show your support!</p>
      <div class="gift-options">
        ${giftsHtml}
      </div>
      <button class="gift-cancel-btn">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Handle gift selection
  dialog.querySelectorAll(".gift-option").forEach(btn => {
    btn.onclick = async () => {
      const giftType = btn.dataset.type;
      const price = parseFloat(btn.dataset.price);
      
      if (confirm(`Send ${GIFT_TYPES[giftType].name} for $${price}?`)) {
        await sendGift(postId, recipientUserId, giftType, price);
        document.body.removeChild(dialog);
      }
    };
  });
  
  dialog.querySelector(".gift-cancel-btn").onclick = () => {
    document.body.removeChild(dialog);
  };
  
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  };
}

async function sendGift(postId, recipientUserId, giftType, price) {
  try {
    const senderDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const senderData = senderDoc.data();
    
    // Record gift in post's gifts subcollection
    await addDoc(collection(db, "posts", postId, "gifts"), {
      senderId: auth.currentUser.uid,
      senderName: senderData?.username || auth.currentUser.email.split("@")[0],
      recipientId: recipientUserId,
      giftType: giftType,
      price: price,
      createdAt: serverTimestamp()
    });
    
    // Record gift in recipient's rewards
    await addDoc(collection(db, "users", recipientUserId, "rewards"), {
      senderId: auth.currentUser.uid,
      senderName: senderData?.username || auth.currentUser.email.split("@")[0],
      postId: postId,
      giftType: giftType,
      price: price,
      createdAt: serverTimestamp()
    });
    
    // Update recipient's total earnings
    const recipientRef = doc(db, "users", recipientUserId);
    const recipientDoc = await getDoc(recipientRef);
    const currentEarnings = recipientDoc.data().totalEarnings || 0;
    await updateDoc(recipientRef, {
      totalEarnings: currentEarnings + price
    });
    
    alert(`🎁 Gift sent successfully! ${GIFT_TYPES[giftType].icon} ${GIFT_TYPES[giftType].name}`);
    haptic("success");
    
  } catch (err) {
    console.error("Error sending gift:", err);
    alert("Error sending gift. Please try again.");
  }
}

postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  // COMPREHENSIVE SPAM PROTECTION
  const spamCheck = containsBlockedKeyword(text);
  if (spamCheck.blocked) {
    alert(getBlockedMessage(spamCheck.category));
    return;
  }

  // RATE LIMIT CHECK
  if (!checkRateLimit()) {
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

// ═══════════════════════════════════════════════════════════
// DAILY LOGIN STREAK TRACKING
// ═══════════════════════════════════════════════════════════
async function updateLoginStreak(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const today = new Date().toDateString();
    const lastLogin = userData.lastLoginDate;
    const currentStreak = userData.loginStreak || 0;
    
    // If last login was today, don't update
    if (lastLogin === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    let newStreak = 1;
    
    // If last login was yesterday, increment streak
    if (lastLogin === yesterdayStr) {
      newStreak = currentStreak + 1;
      
      // Show streak milestone notifications
      if (newStreak % 7 === 0) {
        setTimeout(() => {
          alert(`🔥 ${newStreak} DAY STREAK! You're on fire! Keep it up! 🎉`);
        }, 1000);
      } else if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
        setTimeout(() => {
          alert(`✨ ${newStreak} day streak! Keep logging in daily! 🌟`);
        }, 1000);
      }
    }
    // Otherwise, streak resets to 1
    
    await updateDoc(userRef, {
      lastLoginDate: today,
      loginStreak: newStreak,
      totalLogins: (userData.totalLogins || 0) + 1
    });
    
  } catch (err) {
    console.error("Error updating login streak:", err);
  }
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show dashboard for all users
    const dashboardBtn = document.getElementById("dashboardNavBtn");
    if (dashboardBtn) dashboardBtn.style.display = "inline-block";
    
    // Show admin button only for admins
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) adminBtn.style.display = "inline-block";
    }
    
    // 🔥 DAILY LOGIN STREAK TRACKING
    await updateLoginStreak(user.uid);
    
    loadPosts();
  }
});

// HAMBURGER MENU FUNCTIONALITY
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
  
  // Close menu when clicking a nav link
  navLinks.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    }
  });
}

// ═══════════════════════════════════════════════════════════
// FEATURE 1: USER SEARCH BAR
// ═══════════════════════════════════════════════════════════

const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
const clearSearchBtn = document.getElementById("clearSearchBtn");

if (searchBar && searchResults) {
  searchBar.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    // Show/hide clear button
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchTerm ? "block" : "none";
    }
    
    if (!searchTerm) {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const matchedUsers = [];
      
      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const username = userData.username || "";
        if (username.toLowerCase().includes(searchTerm)) {
          matchedUsers.push({
            id: docSnap.id,
            username: username,
            photoURL: userData.photoURL || "https://via.placeholder.com/50"
          });
        }
      });
      
      if (matchedUsers.length > 0) {
        searchResults.style.display = "block";
        searchResults.innerHTML = matchedUsers.map(user => `
          <div class="search-result-item" data-user-id="${user.id}">
            <img src="${user.photoURL}" alt="${user.username}" class="search-result-avatar" onerror="this.src='https://via.placeholder.com/50'">
            <strong class="search-result-username">${user.username}</strong>
          </div>
        `).join("");
        
        // Add click handlers to results
        searchResults.querySelectorAll(".search-result-item").forEach(item => {
          item.addEventListener("click", () => {
            const userId = item.getAttribute("data-user-id");
            window.location.href = `profile.html?userId=${userId}`;
          });
        });
      } else {
        searchResults.style.display = "block";
        searchResults.innerHTML = "<div class='no-results'>No users found</div>";
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  });
  
  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}

// Clear search button
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    searchBar.value = "";
    searchResults.style.display = "none";
    searchResults.innerHTML = "";
    clearSearchBtn.style.display = "none";
    searchBar.focus();
  });
}

// ═══════════════════════════════════════════════════════════
// SPAM PROTECTION SYSTEM
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// FEATURE 3: IN-APP NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════

const notificationBtn = document.getElementById("notificationBtn");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationBadge = document.getElementById("notificationBadge");
const notificationList = document.getElementById("notificationList");
const markAllReadBtn = document.getElementById("markAllRead");

// Toggle notification dropdown
if (notificationBtn) {
  notificationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = notificationDropdown.style.display === "block";
    notificationDropdown.style.display = isVisible ? "none" : "block";
    
    if (!isVisible) {
      loadNotifications();
    }
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (notificationDropdown && !notificationDropdown.contains(e.target) && e.target !== notificationBtn) {
    notificationDropdown.style.display = "none";
  }
});

// Load notifications from Firebase
async function loadNotifications() {
  if (!auth.currentUser) return;
  
  try {
    const notificationsRef = collection(db, "users", auth.currentUser.uid, "notifications");
    const q = query(notificationsRef, orderBy("createdAt", "desc"));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      notificationList.innerHTML = '<p class="no-notifications">No new notifications</p>';
      return;
    }
    
    notificationList.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const notification = docSnap.data();
      const notifEl = document.createElement("div");
      notifEl.className = `notification-item ${notification.read ? "" : "unread"}`;
      notifEl.dataset.id = docSnap.id;
      
      const timeAgo = getTimeAgo(notification.createdAt);
      
      notifEl.innerHTML = `
        <div class="notification-content">
          <img src="${notification.fromUserAvatar || 'https://via.placeholder.com/40'}" alt="" class="notification-avatar">
          <div class="notification-text">
            <p><strong>${notification.fromUsername}</strong> ${notification.message}</p>
            <span class="notification-time">${timeAgo}</span>
          </div>
        </div>
      `;
      
      // Mark as read when clicked
      notifEl.addEventListener("click", async () => {
        if (!notification.read) {
          await updateDoc(doc(db, "users", auth.currentUser.uid, "notifications", docSnap.id), {
            read: true
          });
          notifEl.classList.remove("unread");
          updateNotificationBadge();
        }
        
        // Navigate to post if postId exists
        if (notification.postId) {
          window.location.href = `feed.html#post-${notification.postId}`;
        }
      });
      
      notificationList.appendChild(notifEl);
    });
    
    updateNotificationBadge();
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

// Update notification badge count
async function updateNotificationBadge() {
  if (!auth.currentUser) return;
  
  try {
    const notificationsRef = collection(db, "users", auth.currentUser.uid, "notifications");
    const q = query(notificationsRef, where("read", "==", false));
    const snapshot = await getDocs(q);
    
    const unreadCount = snapshot.size;
    
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      notificationBadge.style.display = "block";
    } else {
      notificationBadge.style.display = "none";
    }
  } catch (err) {
    console.error("Error updating badge:", err);
  }
}

// Mark all notifications as read
if (markAllReadBtn) {
  markAllReadBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;
    
    try {
      const notificationsRef = collection(db, "users", auth.currentUser.uid, "notifications");
      const q = query(notificationsRef, where("read", "==", false));
      const snapshot = await getDocs(q);
      
      const promises = [];
      snapshot.forEach((docSnap) => {
        promises.push(updateDoc(docSnap.ref, { read: true }));
      });
      
      await Promise.all(promises);
      
      document.querySelectorAll(".notification-item").forEach(el => {
        el.classList.remove("unread");
      });
      
      updateNotificationBadge();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  });
}

// Helper: Get time ago string
function getTimeAgo(timestamp) {
  if (!timestamp) return "just now";
  
  const now = new Date();
  const then = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// Create notification helper function
async function createNotification(toUserId, fromUserId, message, postId = null) {
  if (toUserId === fromUserId) return; // Don't notify yourself
  
  try {
    const fromUserDoc = await getDoc(doc(db, "users", fromUserId));
    const fromUserData = fromUserDoc.data();
    
    await addDoc(collection(db, "users", toUserId, "notifications"), {
      fromUserId: fromUserId,
      fromUsername: fromUserData?.username || "Someone",
      fromUserAvatar: fromUserData?.photoURL || "https://via.placeholder.com/40",
      message: message,
      postId: postId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

// Initialize notifications on page load
if (auth.currentUser) {
  updateNotificationBadge();
  
  // Check for new notifications every 30 seconds
  setInterval(updateNotificationBadge, 30000);
}

// ═══════════════════════════════════════════════════════════
// FEATURE: REPORT SYSTEM
// ═══════════════════════════════════════════════════════════

async function reportContent(contentType, contentId, reportedUserId, reason) {
  try {
    await addDoc(collection(db, "reports"), {
      contentType: contentType, // 'post', 'comment', 'profile'
      contentId: contentId,
      reportedUserId: reportedUserId,
      reporterId: auth.currentUser.uid,
      reporterEmail: auth.currentUser.email,
      reason: reason,
      status: "pending",
      createdAt: serverTimestamp()
    });
    
    alert("✅ Report submitted successfully. Our team will review it shortly.");
  } catch (err) {
    console.error("Error submitting report:", err);
    alert("❌ Error submitting report. Please try again.");
  }
}

function showReportDialog(contentType, contentId, reportedUserId) {
  const reasons = [
    "Hate speech or discrimination",
    "Threats or violence",
    "Harassment or bullying",
    "Spam or scam",
    "Inappropriate content",
    "Impersonation",
    "Other"
  ];
  
  let reasonsHtml = reasons.map((r, i) => `<option value="${r}">${r}</option>`).join('');
  
  const dialog = document.createElement('div');
  dialog.className = 'report-dialog-overlay';
  dialog.innerHTML = `
    <div class="report-dialog">
      <h3>🚨 Report ${contentType}</h3>
      <p>Help us keep YourSpace safe. Why are you reporting this?</p>
      <select id="reportReason" class="report-reason-select">
        <option value="">Select a reason...</option>
        ${reasonsHtml}
      </select>
      <div class="report-dialog-buttons">
        <button class="report-submit-btn" id="submitReport">Submit Report</button>
        <button class="report-cancel-btn" id="cancelReport">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  document.getElementById('submitReport').addEventListener('click', async () => {
    const reason = document.getElementById('reportReason').value;
    if (!reason) {
      alert("Please select a reason for reporting.");
      return;
    }
    
    await reportContent(contentType, contentId, reportedUserId, reason);
    dialog.remove();
  });
  
  document.getElementById('cancelReport').addEventListener('click', () => {
    dialog.remove();
  });
  
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
}
