// notifications.js - Real-time browser notifications system

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
      Notification.requestPermission();
    }
  }
}

function showNotification(title, body, icon = "🔔") {
  if ("Notification" in window && Notification.permission === "granted") {
    // Don't spam notifications - rate limit to 1 per 3 seconds
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
    
    setTimeout(() => notification.close(), 5000);
  }
}

export function initNotifications(currentUser) {
  if (!currentUser || isInitialized) return;
  isInitialized = true;

  // Request permission on first load
  requestNotificationPermission();

  // Listen for likes on user's posts
  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  let initialPostLoad = true;
  const userPostLikeCounts = new Map();

  onSnapshot(postsQuery, (snapshot) => {
    if (initialPostLoad) {
      // Store initial like counts
      snapshot.forEach(doc => {
        const post = doc.data();
        userPostLikeCounts.set(doc.id, (post.likedBy || []).length);
      });
      initialPostLoad = false;
      return;
    }

    snapshot.forEach(doc => {
      const post = doc.data();
      const postId = doc.id;
      const currentLikes = (post.likedBy || []).length;
      const previousLikes = userPostLikeCounts.get(postId) || 0;

      if (currentLikes > previousLikes) {
        const newLikes = currentLikes - previousLikes;
        showNotification(
          "👍 New Like!",
          `Your post received ${newLikes} new like${newLikes > 1 ? 's' : ''}!`,
          "👍"
        );
      }

      userPostLikeCounts.set(postId, currentLikes);
    });
  });

  // Listen for comments on user's posts
  let initialCommentLoad = true;
  const userPostCommentCounts = new Map();

  onSnapshot(postsQuery, (snapshot) => {
    snapshot.forEach(async (postDoc) => {
      const postId = postDoc.id;
      const commentsQuery = query(
        collection(db, "posts", postId, "comments"),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      onSnapshot(commentsQuery, (commentSnap) => {
        if (initialCommentLoad) {
          userPostCommentCounts.set(postId, commentSnap.size);
          return;
        }

        const currentComments = commentSnap.size;
        const previousComments = userPostCommentCounts.get(postId) || 0;

        if (currentComments > previousComments) {
          const newComment = commentSnap.docs[0].data();
          if (newComment.userId !== currentUser.uid) {
            showNotification(
              "💬 New Comment!",
              `${newComment.username} commented on your post`,
              "💬"
            );
          }
        }

        userPostCommentCounts.set(postId, currentComments);
      });
    });

    if (initialCommentLoad) {
      setTimeout(() => { initialCommentLoad = false; }, 2000);
    }
  });

  // Listen for wall comments on user's profile
  const wallCommentsQuery = query(
    collection(db, "users", currentUser.uid, "wallComments"),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  let initialWallLoad = true;
  let lastWallCommentCount = 0;

  onSnapshot(wallCommentsQuery, (snapshot) => {
    if (initialWallLoad) {
      lastWallCommentCount = snapshot.size;
      initialWallLoad = false;
      return;
    }

    if (snapshot.size > lastWallCommentCount) {
      const newComment = snapshot.docs[0].data();
      if (newComment.authorId !== currentUser.uid) {
        showNotification(
          "💬 New Wall Comment!",
          `${newComment.authorName} commented on your profile`,
          "💬"
        );
      }
    }

    lastWallCommentCount = snapshot.size;
  });

  // Listen for new messages
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  const conversationMessageCounts = new Map();
  let initialMessagesLoad = true;

  onSnapshot(conversationsQuery, (snapshot) => {
    snapshot.forEach((convDoc) => {
      const convId = convDoc.id;
      const messagesQuery = query(
        collection(db, "conversations", convId, "messages"),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      onSnapshot(messagesQuery, (messageSnap) => {
        if (initialMessagesLoad) {
          conversationMessageCounts.set(convId, messageSnap.size);
          return;
        }

        const currentMessageCount = messageSnap.size;
        const previousMessageCount = conversationMessageCounts.get(convId) || 0;

        if (currentMessageCount > previousMessageCount) {
          const newMessage = messageSnap.docs[0].data();
          if (newMessage.senderId !== currentUser.uid) {
            showNotification(
              "✉️ New Message!",
              "You have a new private message",
              "✉️"
            );
          }
        }

        conversationMessageCounts.set(convId, currentMessageCount);
      });
    });

    if (initialMessagesLoad) {
      setTimeout(() => { initialMessagesLoad = false; }, 2000);
    }
  });

  console.log("📢 Live notifications initialized!");
}

// Auto-initialize when user logs in
auth.onAuthStateChanged((user) => {
  if (user) {
    setTimeout(() => initNotifications(user), 1000);
  }
});
