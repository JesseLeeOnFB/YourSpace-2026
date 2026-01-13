// feed.js
console.log("🔥 feed.js loaded");

import { auth, db } from "./script.js";
import { collection, addDoc, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const publishBtn = document.getElementById("publishBtn");
const feedContainer = document.getElementById("feedContainer");

async function loadFeed() {
  feedContainer.innerHTML = "";
  const postsSnap = await getDocs(collection(db, "posts"));
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

if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    const title = document.getElementById("postTitle").value;
    const content = document.getElementById("postContent").value;
    const image = document.getElementById("postImage").value;
    if (!content && !title) return alert("Enter something to post!");
    await addDoc(collection(db, "posts"), {
      title,
      content,
      image,
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName,
      timestamp: new Date()
    });
    loadFeed();
  });
}

window.onload = loadFeed;
