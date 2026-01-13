console.log("🔥 feed.js loaded");

// Firebase imports (replace with your actual firebaseConfig import)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, getDoc, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const postsContainer = document.getElementById("postsContainer");
const trendingPost = document.getElementById("trendingPost");

// Utility to render posts
function renderPosts(snapshot) {
  postsContainer.innerHTML = "";
  let trending = null;
  let maxScore = 0;

  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const score = (post.likes?.length || 0) + (post.comments?.length || 0) + (post.shares?.length || 0);
    if(score > maxScore){
      maxScore = score;
      trending = { ...post, postId };
    }

    const div = document.createElement("div");
    div.classList.add("post");
    const userLiked = post.likes?.includes(auth.currentUser.uid);
    div.innerHTML = `
      <p><strong>${post.username || "Anonymous"}</strong></p>
      <p>${post.content}</p>
      ${post.imageURL ? `<img src="${post.imageURL}" />` : ""}
      <button class="likeBtn" data-id="${postId}">${userLiked ? "Unlike" : "Like"} (${post.likes?.length || 0})</button>
      <button class="shareBtn" data-id="${postId}">Share (${post.shares?.length || 0})</button>
      <input class="commentInput" data-id="${postId}" placeholder="Comment..." />
      <button class="commentBtn" data-id="${postId}">Post Comment (${post.comments?.length || 0})</button>
      ${auth.currentUser.uid === post.userId ? `<button class="deleteBtn" data-id="${postId}">Delete</button>` : ""}
      <div class="commentsContainer"></div>
    `;
    postsContainer.appendChild(div);

    const commentsContainer = div.querySelector(".commentsContainer");
    post.comments?.forEach(c => {
      const cDiv = document.createElement("div");
      cDiv.textContent = `${c.username}: ${c.content}`;
      commentsContainer.appendChild(cDiv);
    });
  });

  // Show trending post
  if(trending){
    trendingPost.innerHTML = `
      <h2>Trending Post</h2>
      <p><strong>${trending.username}</strong></p>
      <p>${trending.content}</p>
      ${trending.imageURL ? `<img src="${trending.imageURL}" />` : ""}
      <p>Score: ${(trending.likes?.length || 0) + (trending.comments?.length || 0) + (trending.shares?.length || 0)}</p>
    `;
  }

  // Attach button listeners
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const postId = e.target.dataset.id;
      await deleteDoc(doc(db, "posts", postId));
    });
  });

  document.querySelectorAll(".likeBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const postId = e.target.dataset.id;
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      let likes = postSnap.data().likes || [];
      if(likes.includes(auth.currentUser.uid)){
        likes = likes.filter(uid => uid !== auth.currentUser.uid); // Unlike
      } else {
        likes.push(auth.currentUser.uid); // Like
      }
      await setDoc(postRef, { likes }, { merge: true });
    });
  });

  document.querySelectorAll(".shareBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const postId = e.target.dataset.id;
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      let shares = postSnap.data().shares || [];
      if(!shares.includes(auth.currentUser.uid)) shares.push(auth.currentUser.uid);
      await setDoc(postRef, { shares }, { merge: true });
    });
  });

  document.querySelectorAll(".commentBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const postId = e.target.dataset.id;
      const input = document.querySelector(`.commentInput[data-id='${postId}']`);
      const content = input.value.trim();
      if(!content) return;
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      let comments = postSnap.data().comments || [];
      comments.push({
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || "Anonymous",
        content,
        timestamp: new Date()
      });
      await setDoc(postRef, { comments }, { merge: true });
      input.value = "";
    });
  });

}

// Real-time listener
function listenPosts(){
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, renderPosts);
}

// Refresh trending every hour
setInterval(listenPosts, 60 * 60 * 1000); // 1 hour
listenPosts();
