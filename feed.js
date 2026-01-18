// feed.js — FINAL STABLE VERSION (YourSpace 2026)

import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* DOM */
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");

/* Nav */
document.getElementById("navFeedBtn").onclick = () => location.href = "feed.html";
document.getElementById("navProfileBtn").onclick = () => location.href = "profile.html";
document.getElementById("navMessagesBtn").onclick = () => location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};

/* Auth */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;
  loadFeed();
});

/* Load Feed */
function loadFeed() {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    feedContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      renderPost(docSnap.id, docSnap.data());
    });
  });
}

/* Render Post */
function renderPost(postId, post) {
  const div = document.createElement("div");
  div.className = "post";

  const isOwner = post.userId === currentUser.uid;

  div.innerHTML = `
    <strong>${post.username || "Anonymous"}</strong>
    <p>${post.text || ""}</p>

    ${post.imageURL ? `<img src="${post.imageURL}" />` : ""}

    <div class="actions">
      <button class="likeBtn">Like (${post.likes?.length || 0})</button>
      <button class="dislikeBtn">Dislike (${post.dislikes?.length || 0})</button>
      ${isOwner ? `<button class="deleteBtn">Delete</button>` : ""}
    </div>
  `;

  /* Like */
  div.querySelector(".likeBtn").onclick = async () => {
    await updateDoc(doc(db, "posts", postId), {
      likes: arrayUnion(currentUser.uid),
      dislikes: arrayRemove(currentUser.uid)
    });
  };

  /* Dislike */
  div.querySelector(".dislikeBtn").onclick = async () => {
    await updateDoc(doc(db, "posts", postId), {
      dislikes: arrayUnion(currentUser.uid),
      likes: arrayRemove(currentUser.uid)
    });
  };

  /* Delete */
  if (isOwner) {
    div.querySelector(".deleteBtn").onclick = async () => {
      if (confirm("Delete this post?")) {
        await deleteDoc(doc(db, "posts", postId));
      }
    };
  }

  feedContainer.appendChild(div);
}

/* Create Post */
postBtn.onclick = async () => {
  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) {
    alert("Write something or add an image");
    return;
  }

  let imageURL = "";

  if (file) {
    const fileRef = ref(
      storage,
      `posts/${currentUser.uid}/${Date.now()}-${file.name}`
    );

    await uploadBytes(fileRef, file);
    imageURL = await getDownloadURL(fileRef);
  }

  await addDoc(collection(db, "posts"), {
    text,
    imageURL,
    userId: currentUser.uid,
    username: currentUser.email.split("@")[0],
    createdAt: serverTimestamp(),
    likes: [],
    dislikes: []
  });

  postText.value = "";
  postImage.value = "";
};
