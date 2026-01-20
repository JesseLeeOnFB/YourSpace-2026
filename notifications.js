// notifications.js - Real-time browser notifications (with error handling + safety cap)

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

// Notification sound (unchanged)
const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwNUKXh8LJnHwU2jdT0zn0vBSh+zPLaizsKFFu16+qnVhMJRp/g8r5sIAUrgc/z2YY2Bxtr');

export function requestNotificationPermission() {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("🔔 Browser notifications enabled!");
          showNotification("Test", "Notifications are now enabled!");
        }
      });
    }
  }
}

function showNotification(title, body, icon = "🔔") {
  if ("Notification" in window && Notification.permission === "granted") {
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

const postCommentUnsubs = new Map();
const convMessageUnsubs = new Map();

export function initNotifications(currentUser) {
  if (!currentUser || isInitialized) return;
  isInitialized = true;

  console.log("📢 Initializing live notifications...");

  // === Likes & setup for recent posts (comments) ===
  const MAX_COMMENT_MONITORED_POSTS = 1000; // Safety cap — adjust or remove if desired

  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
    // No limit here → likes detected on EVERY post
  );

  const postLikeCounts = new Map();
  let monitoredPostIds = new Set(); // For comment listener cap

  const unsubPosts = onSnapshot(postsQuery, 
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const postId = change.doc.id;
        const data = change.doc.data();

        if (change.type === "added" || change.type === "modified") {
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

          // Setup comment listener only for recent posts (safety)
          if (change.type === "added" && monitoredPostIds.size < MAX_COMMENT_MONITORED_POSTS) {
            setupPostCommentListener(postId, currentUser.uid);
            monitoredPostIds.add(postId);
          }
        }

        if (change.type === "removed") {
          postLikeCounts.delete(postId);
          if (postCommentUnsubs.has(postId)) {
            postCommentUnsubs.get(postId)();
            postCommentUnsubs.delete(postId);
            monitoredPostIds.delete(postId);
          }
        }
      });

      // Initial load: setup comment listeners for existing recent posts
      if (snapshot.metadata.fromCache === false && snapshot.docs.length > 0) {
        snapshot.docs.slice(0, MAX_COMMENT_MONITORED_POSTS).forEach((doc) => {
          const postId = doc.id;
          postLikeCounts.set(postId, (doc.data().likedBy || []).length);
          if (!monitoredPostIds.has(postId)) {
            setupPostCommentListener(postId, currentUser.uid);
            monitoredPostIds.add(postId);
          }
        });
      }
    },
    (error) => {
      console.error("🔥 Posts listener error (likely missing index):", error);
      // If index error, it will log the create-index link here
    }
  );

  // === Comment listener per post (lightweight, only latest) ===
  function setupPostCommentListener(postId, uid) {
    if (postCommentUnsubs.has(postId)) return;

    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let previousCommentId = null;

    const unsub = onSnapshot(commentsQuery,
      (snap) => {
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
        }

        previousCommentId = latestId;
      },
      (error) => {
        console.error(`🔥 Comment listener error for post ${postId}:`, error);
      }
    );

    postCommentUnsubs.set(postId, unsub);
  }

  // === Wall comments ===
  const wallQuery = query(
    collection(db, "users", currentUser.uid, "wallComments"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  let prevWallCommentId = null;

  onSnapshot(wallQuery,
    (snap) => {
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
    },
    (error) => console.error("🔥 Wall comments listener error:", error)
  );

  // === Private messages (unchanged, with error handling) ===
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  onSnapshot(conversationsQuery,
    (snapshot) => {
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
    },
    (error) => console.error("🔥 Conversations listener error:", error)
  );

  function setupConversationMessageListener(convId, uid) {
    if (convMessageUnsubs.has(convId)) return;

    const messagesQuery = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let previousMessageId = null;

    const unsub = onSnapshot(messagesQuery,
      (snap) => {
        if (snap.empty) {
          previousMessageId = null;
          return;
        }

        const latestId = snap.docs[0].id;
        const messageData = snap.docs[0].data();

        if (latestId !== previousMessageId && messageData.senderId !== uid) {
          showNotification(
            "✉️ New Message!",
            "You have a new private message",
            "✉️"
          );
        }

        previousMessageId = latestId;
      },
      (error) => console.error(`🔥 Message listener error for conv ${convId}:`, error)
    );

    convMessageUnsubs.set(convId, unsub);
  }

  console.log("📢 Live notifications initialized! (Check console for any errors)");
}

// Auto-init on login
auth.onAuthStateChanged((user) => {
  if (user) {
    setTimeout(() => initNotifications(user), 1000);
  }
});
