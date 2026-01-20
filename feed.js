// feed.js - Social Feed with Comments, Likes, and Notifications

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, addDoc, doc, deleteDoc, getDoc,
updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;
import { getAuth, signOut } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;
import { getStorage, ref, uploadBytes, getDownloadURL } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

const BLOCKED_KEYWORDS = [
“n***er”, “n***a”, “f****t”, “d**e”, “ch**k”, “sp*c”, “k**e”, “r****d”,
“kill yourself”, “kys”, “kill you”, “murder”, “bomb threat”,
“suicide”, “cut myself”, “end it all”, “kill myself”
];

function containsBlockedKeyword(text) {
const lowerText = text.toLowerCase();
return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isAdmin(email) {
return ADMIN_EMAILS.includes(email.toLowerCase());
}

function haptic(type = “light”) {
if (!navigator.vibrate) return;
if (type === “light”) navigator.vibrate(10);
if (type === “medium”) navigator.vibrate(20);
if (type === “heavy”) navigator.vibrate([30, 20, 30]);
}

const postsContainer = document.getElementById(“postsContainer”);
const postBtn = document.getElementById(“postBtn”);
const postText = document.getElementById(“postText”);
const postFileInput = document.getElementById(“postFileInput”);

document.getElementById(“feedNavBtn”).addEventListener(“click”, () => {
window.location.href = “feed.html”;
});

document.getElementById(“profileNavBtn”).addEventListener(“click”, () => {
window.location.href = “profile.html”;
});

document.getElementById(“messagesNavBtn”).addEventListener(“click”, () => {
window.location.href = “messages.html”;
});

document.getElementById(“contactNavBtn”).addEventListener(“click”, () => {
window.location.href = “contact.html”;
});

document.getElementById(“logoutBtn”).addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
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

const userDoc = await getDoc(doc(db, “users”, currentUserId));
const savedPosts = userDoc.data()?.savedPosts || [];
const isSaved = savedPosts.includes(postId);

const postEl = document.createElement(“div”);
postEl.className = “post-card”;
if (isPinned) postEl.classList.add(“pinned-post”);
if (isTrending) postEl.classList.add(“trending-post”);

const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : “just now”;

postEl.innerHTML = `${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''} ${isTrending && !isPinned ? '<div class="trending-badge">🔥 Trending Now</div>' : ''} <div class="post-header"> <strong>${post.username || "Anonymous"}</strong> <small>${time}</small> </div> <p>${post.text || ""}</p> ${post.mediaURL ?`<${post.mediaType === “video” ? “video controls” : “img”} src=”${post.mediaURL}” class=“post-media” />`: ""} <div class="actions"> <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button> <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">👎 ${dislikedBy.length}</button> <button class="comment-toggle" data-id="${postId}">💬 Comments</button> <button class="share-btn" data-id="${postId}">🔗 Share</button> <button class="save-btn ${isSaved ? 'saved' : ''}" data-id="${postId}">${isSaved ? '🔖 Saved' : '🔖 Save'}</button> ${isOwner ?`<button class="delete-btn" data-id="${postId}">🗑️ Delete</button>`: ""} ${isAdmin(currentUserEmail) && !isPinned ?`<button class="pin-btn" data-id="${postId}">📌 Pin</button>`: ""} ${isAdmin(currentUserEmail) && isPinned ?`<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>`: ""} </div> <div class="comments-section" id="comments-${postId}" style="display:none;"></div> <div class="comment-form" style="display:none;"> <input type="text" class="comment-input" placeholder="Write a comment..." /> <button class="comment-btn" data-id="${postId}">💬 Post</button> </div>`;

postEl.querySelector(”.like-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“light”);
const postRef = doc(db, “posts”, postId);

```
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

  if (post.userId !== currentUserId) {
    await addDoc(collection(db, "notifications"), {
      userId: post.userId,
      type: "like",
      from: currentUserId,
      fromUsername: auth.currentUser.email.split("@")[0],
      postId: postId,
      read: false,
      timestamp: serverTimestamp()
    });
  }
}
```

};

postEl.querySelector(”.dislike-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“light”);
const postRef = doc(db, “posts”, postId);

```
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
```

};

postEl.querySelector(”.share-btn”).onclick = (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“medium”);
navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
alert(“Post link copied!”);
};

postEl.querySelector(”.save-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“medium”);

```
const userRef = doc(db, "users", currentUserId);
const userDoc = await getDoc(userRef);
const currentSavedPosts = userDoc.data()?.savedPosts || [];

if (currentSavedPosts.includes(postId)) {
  await updateDoc(userRef, {
    savedPosts: arrayRemove(postId)
  });
  e.target.classList.remove('saved');
  e.target.textContent = '🔖 Save';
} else {
  await updateDoc(userRef, {
    savedPosts: arrayUnion(postId)
  });
  e.target.classList.add('saved');
  e.target.textContent = '🔖 Saved';
}
```

};

const deleteBtn = postEl.querySelector(”.delete-btn”);
if (deleteBtn) {
deleteBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
haptic(“heavy”);
if (confirm(“Delete this post?”)) {
try {
await deleteDoc(doc(db, “posts”, postId));
postEl.remove();
} catch (err) {
alert(“Error deleting post: “ + err.message);
}
}
});
}

const pinBtn = postEl.querySelector(”.pin-btn”);
if (pinBtn) {
pinBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
try {
await updateDoc(doc(db, “posts”, postId), { pinned: true });
alert(“Post pinned to top of feed!”);
} catch (err) {
alert(“Error pinning post: “ + err.message);
}
});
}

const unpinBtn = postEl.querySelector(”.unpin-btn”);
if (unpinBtn) {
unpinBtn.addEventListener(“click”, async (e) => {
e.preventDefault();
e.stopPropagation();
try {
await updateDoc(doc(db, “posts”, postId), { pinned: false });
} catch (err) {
alert(“Error unpinning post: “ + err.message);
}
});
}

const commentToggle = postEl.querySelector(”.comment-toggle”);
const commentsSection = postEl.querySelector(”.comments-section”);
const commentForm = postEl.querySelector(”.comment-form”);

commentToggle.addEventListener(“click”, () => {
const isVisible = commentsSection.style.display !== “none”;
commentsSection.style.display = isVisible ? “none” : “block”;
commentForm.style.display = isVisible ? “none” : “flex”;
});

const commentsQ = query(collection(db, “posts”, postId, “comments”), orderBy(“createdAt”, “desc”));

onSnapshot(commentsQ, (snap) => {
commentsSection.innerHTML = “”;

```
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
      ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️ Delete</button>` : ""}
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

  cEl.querySelector(".reply-btn").onclick = () => {
    const replyForm = document.getElementById(`reply-form-${cDoc.id}`);
    replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none";
  };

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

  const replyCancelBtn = cEl.querySelector(".reply-cancel-btn");
  if (replyCancelBtn) {
    replyCancelBtn.onclick = () => {
      document.getElementById(`reply-form-${cDoc.id}`).style.display = "none";
    };
  }

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
```

});

postEl.querySelector(”.comment-btn”).onclick = async (e) => {
e.preventDefault();
e.stopPropagation();
const input = postEl.querySelector(”.comment-input”);
const text = input.value.trim();
if (!text) return;

```
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

  if (post.userId !== auth.currentUser.uid) {
    await addDoc(collection(db, "notifications"), {
      userId: post.userId,
      type: "comment",
      from: auth.currentUser.uid,
      fromUsername: username,
      postId: postId,
      commentText: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
      read: false,
      timestamp: serverTimestamp()
    });
  }
} catch (err) {
  alert("Error posting comment: " + err.message);
}
```

};

postsContainer.appendChild(postEl);
}

function loadPosts() {
const q = query(collection(db, “posts”), orderBy(“createdAt”, “desc”));

onSnapshot(q, (snap) => {
postsContainer.innerHTML = “”;

```
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

pinnedPosts.forEach(({ data, id }) => renderPost(data, id));
trendingPosts.forEach(({ data, id }) => renderPost(data, id));
regularPosts.forEach(({ data, id }) => renderPost(data, id));
```

});
}

postBtn.addEventListener(“click”, async () => {
const text = postText.value.trim();
const file = postFileInput.files[0];

if (!text && !file) return alert(“Post cannot be empty”);

if (containsBlockedKeyword(text)) {
alert(“Your post contains blocked content and cannot be published. Please remove offensive language.”);
return;
}

let mediaURL = “”;
let mediaType = “”;

if (file) {
mediaType = file.type.startsWith(“video”) ? “video” : “image”;
const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
await uploadBytes(storageRef, file);
mediaURL = await getDownloadURL(storageRef);
}

const userDoc = await getDoc(doc(db, “users”, auth.currentUser.uid));
const userData = userDoc.data();
const username = userData?.username || auth.currentUser.email.split(”@”)[0];

try {
await addDoc(collection(db, “posts”), {
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

```
haptic("medium");

postText.value = "";
postFileInput.value = "";
```

} catch (err) {
alert(“Error creating post: “ + err.message);
}
});

auth.onAuthStateChanged((user) => {
if (!user) window.location.href = “login.html”;
else loadPosts();
});

function setupNotifications() {
const notifBtn = document.getElementById(“notificationsBtn”);
const notifModal = document.getElementById(“notificationsModal”);
const closeBtn = document.getElementById(“closeNotifModal”);
const notifCount = document.getElementById(“notifCount”);
const notifsList = document.getElementById(“notificationsList”);

const notifQuery = query(
collection(db, “notifications”),
where(“userId”, “==”, auth.currentUser.uid),
orderBy(“timestamp”, “desc”)
);

onSnapshot(notifQuery, async (snapshot) => {
const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
notifCount.textContent = unreadCount;
notifCount.style.display = unreadCount > 0 ? “inline” : “none”;

```
notifsList.innerHTML = "";

if (snapshot.empty) {
  notifsList.innerHTML = "<p class='no-notifs'>No notifications yet</p>";
  return;
}

for (const docSnap of snapshot.docs) {
  const notif = docSnap.data();
  const notifId = docSnap.id;

  const notifEl = document.createElement("div");
  notifEl.className = `notification-item ${notif.read ? 'read' : 'unread'}`;

  let message = "";
  if (notif.type === "like") {
    message = `<strong>${notif.fromUsername}</strong> liked your post`;
  } else if (notif.type === "comment") {
    message = `<strong>${notif.fromUsername}</strong> commented: "${notif.commentText}"`;
  } else if (notif.type === "reply") {
    message = `<strong>${notif.fromUsername}</strong> replied to your comment`;
  }

  const time = notif.timestamp ? new Date(notif.timestamp.toMillis()).toLocaleString() : "just now";

  notifEl.innerHTML = `
    <div class="notif-content">
      <p>${message}</p>
      <small>${time}</small>
    </div>
    <button class="mark-read-btn" data-id="${notifId}">${notif.read ? '✓' : '📧'}</button>
  `;

  notifEl.querySelector(".mark-read-btn").onclick = async (e) => {
    e.stopPropagation();
    await updateDoc(doc(db, "notifications", notifId), {
      read: !notif.read
    });
  };

  notifEl.onclick = () => {
    if (notif.postId) {
      window.location.href = `feed.html#${notif.postId}`;
      notifModal.style.display = "none";
    }
  };

  notifsList.appendChild(notifEl);
}
```

});

notifBtn.onclick = () => {
notifModal.style.display = “block”;
};

closeBtn.onclick = () => {
notifModal.style.display = “none”;
};

window.onclick = (e) => {
if (e.target === notifModal) {
notifModal.style.display = “none”;
}
};
}

setTimeout(() => {
if (auth.currentUser) {
setupNotifications();
}
}, 1000);
