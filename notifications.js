// notifications.js - Real-time browser notifications system (rewritten for UNLIMITED posts/conversations)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

let isInitialized = false;
let lastNotificationTime = Date.now();

// Notification sound
const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwNUKXh8LJnHwU2jdT0zn0vBSh+zPLaizsKFFu16+qnVhMJRp/g8r5sIAUrgc/z2YY2Bxtr');

export function requestNotificationPermission() {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("🔔 Browser notifications enabled!");
          // Optional test notification
          showNotification("Test", "Notifications are now enabled!");
        }
      });
    }
  }
}

function showNotification(title, body, icon = "🔔") {
  if ("Notification" in window && Notification.permission === "granted") {
    // Rate limit to 1 per 3 seconds (prevents spam)
    if (Date.now() - lastNotificationTime < 3000) return;
    
    lastNotificationTime = Date.now();
    
    const notification = new Notification(title, {
      body: body,
      icon: icon,
      badge: "🔔",
      tag: "yourspace-notification",
      requireInteraction: false
    });
    
    notificationSound.play().catch(() => {});
    
    setTimeout(() => notification.close(), 7000);
  }
}

// Maps to store unsubscribe functions for dynamic listeners
const postCommentUnsubs = new Map(); // postId => unsubscribe
const convMessageUnsubs = new Map(); // convId => unsubscribe

export function initNotifications(currentUser) {
  if (!currentUser || isInitialized) return;
  isInitialized = true;

  // IMPORTANT: Do NOT call requestNotificationPermission() here automatically.
  // It must be triggered by a user gesture (e.g. button click) or it will be blocked.
  // Call requestNotificationPermission() from a button in your UI instead.

  // === Likes on ALL user's posts (no limit) ===
  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
    // No limit → covers every post, even years old
  );

  const postLikeCounts = new Map(); // postId => previous like count
  let postsInitialLoad = true;

  onSnapshot(postsQuery, (snapshot) => {
    if (postsInitialLoad) {
      // Initial load: store like counts and set up comment listeners for all existing posts
      snapshot.forEach((doc) => {
        const data = doc.data();
        postLikeCounts.set(doc.id, (data.likedBy || []).length);
        setupPostCommentListener(doc.id, currentUser.uid);
      });
      postsInitialLoad = false;
      return;
    }

    // Handle real-time changes
    snapshot.docChanges().forEach((change) => {
      const postId = change.doc.id;
      const data = change.doc.data();

      if (change.type === "added") {
        postLikeCounts.set(postId, (data.likedBy || []).length);
        setupPostCommentListener(postId, currentUser.uid);
      }

      if (change.type === "modified") {
        const prevLikes = postLikeCounts.get(postId) || 0;
        const currLikes = (data.likedBy || []).length;

        if (currLikes > prevLikes) {
          const newLikes = currLikes - prevLikes;
          showNotification(
            "👍 New Like!",
            `Your post received ${newLikes} new like${newLikes > 1 ? 's' : ''}!`,
            "👍"
          );
        }
        postLikeCounts.set(postId, currLikes);
      }

      if (change.type === "removed") {
        postLikeCounts.delete(postId);
        if (postCommentUnsubs.has(postId)) {
          postCommentUnsubs.get(postId)();
          postCommentUnsubs.delete(postId);
        }
      }
    });
  });

  // === Comments on individual posts (one lightweight listener per post) ===
  function setupPostCommentListener(postId, uid) {
    if (postCommentUnsubs.has(postId)) return; // Already listening

    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let previousCommentId = null;

    const unsub = onSnapshot(commentsQuery, (snap) => {
      if (snap.empty) {
        previousCommentId = null;
        return;
      }

      const latestDoc = snap.docs[0];
      const latestId = latestDoc.id;
      const commentData = latestDoc.data();

      if (latestId !== previousCommentId && commentData.userId !== uid) {
        const username = commentData.username || "Someone";
        showNotification(
          "💬 New Comment!",
          `${username} commented on your post`,
          "💬"
        );
        // Optional: include snippet of comment
        // if (commentData.text) body += `: "${commentData.text.substring(0, 50)}..."`;
      }

      previousCommentId = latestId;
    });

    postCommentUnsubs.set(postId, unsub);
  }

  // === Wall comments on user profile ===
  const wallQuery = query(
    collection(db, "users", currentUser.uid, "wallComments"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  let prevWallCommentId = null;

  onSnapshot(wallQuery, (snap) => {
    if (snap.empty) {
      prevWallCommentId = null;
      return;
    }

    const latestId = snap.docs[0].id;
    const data = snap.docs[0].data();

    if (latestId !== prevWallCommentId && data.authorId !== currentUser.uid) {
      showNotification(
        "💬 New Wall Comment!",
        `${data.authorName} commented on your profile`,
        "💬"
      );
    }

    prevWallCommentId = latestId;
  });

  // === Private messages in ALL conversations ===
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
    // No limit → all conversations
  );

  let convsInitialLoad = true;

  onSnapshot(conversationsQuery, (snapshot) => {
    if (convsInitialLoad) {
      snapshot.forEach((doc) => {
        setupConversationMessageListener(doc.id, currentUser.uid);
      });
      convsInitialLoad = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      const convId = change.doc.id;

      if (change.type === "added") {
        setupConversationMessageListener(convId, currentUser.uid);
      }

      if (change.type === "removed") {
        if (convMessageUnsubs.has(convId)) {
          convMessageUnsubs.get(convId)();
          convMessageUnsubs.delete(convId);
        }
      }
    });
  });

  function setupConversationMessageListener(convId, uid) {
    if (convMessageUnsubs.has(convId)) return;

    const messagesQuery = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let previousMessageId = null;

    const unsub = onSnapshot(messagesQuery, (snap) => {
      if (snap.empty) {
        previousMessageId = null;
        return;
      }

      const latestId = snap.docs[0].id;
      const messageData = snap.docs[0].data();

      if (latestId !== previousMessageId && messageData.senderId !== uid) {
        // Generic message (original code didn't show sender name)
        showNotification(
          "✉️ New Message!",
          "You have a new private message",
          "✉️"
        );
        // If your message docs include username/senderName, you can do:
        // const sender = messageData.username || messageData.senderName || "Someone";
        // body = `${sender} sent you a message`;
      }

      previousMessageId = latestId;
    });

    convMessageUnsubs.set(convId, unsub);
  }

  console.log("📢 Live notifications initialized for ALL posts & conversations!");
}

// Auto-initialize when user logs in
auth.onAuthStateChanged((user) => {
  if (user) {
    setTimeout(() => initNotifications(user), 1000);
  } else {
    // Optional cleanup on logout
    isInitialized = false;
    // You could unsubscribe everything here if desired
  }
});
