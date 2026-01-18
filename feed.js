// feed.js – Debug version: shows alerts, waits for auth, loads/posts real-time

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedPosts = document.getElementById("feedPosts");

// Navigation (JS only)
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("navProfileBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("navMessagesBtn")?.addEventListener("click", () => window.location.href = "messages.html");

// Load feed real-time
function loadFeed() {
  alert("Feed loading started – user is authenticated");

  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    feedPosts.innerHTML = "";

    if (snap.empty) {
      feedPosts.innerHTML = '<p>No posts yet. Be the first to post!</p>';
      alert("No posts found in 'posts' collection");
      return;
    }

    alert("Feed loaded – " + snap.size + " posts found");

    snap.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <strong>${post.username || "Anonymous"}</strong>
        <p>${post.text || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" style="max-width: 100%;">` : ""}
      `;
      feedPosts.appendChild(div);
    });
  }, (err) => {
    alert("Feed load error: " + err.message);
  });
}

// Post new text (image upload stubbed for simplicity)
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not logged in");

  const text = postText.value.trim();
  if (!text) return alert("Write something");

  try {
    await addDoc(collection(db, "posts"), {
      text,
      username: auth.currentUser.email.split('@')[0] || "Anonymous",
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    postText.value = "";
    alert("Post created!");
  } catch (err) {
    alert("Post failed: " + err.message);
  }
});

// Init
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  alert("Logged in as " + user.email + " – loading feed...");
  loadFeed();
});
