import { auth, db } from "./script.js";
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// DOM Elements
const publishBtn = document.getElementById("publishBtn");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logoutBtn");

auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "index.html";
  else loadFeed();
});

async function loadFeed() {
  feedContainer.innerHTML = "";
  const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("timestamp", "desc")));
  postsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post-card";
    postDiv.innerHTML = `
      <h3>${data.title}</h3>
      <p>${data.content}</p>
      ${data.image ? `<img src="${data.image}"/>` : ""}
      <p>By: ${data.username || "Anonymous"}</p>
    `;
    feedContainer.appendChild(postDiv);
  });
}

// Publish post
publishBtn.addEventListener("click", async () => {
  const title = document.getElementById("postTitle").value;
  const content = document.getElementById("postContent").value;
  const image = document.getElementById("postImage").value;

  if (!title && !content) return alert("Enter something to post!");

  await addDoc(collection(db, "posts"), {
    title,
    content,
    image,
    username: auth.currentUser.displayName,
    userId: auth.currentUser.uid,
    timestamp: new Date()
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postContent").value = "";
  document.getElementById("postImage").value = "";

  loadFeed();
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
