import { db, auth } from "./config.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const createPostBtn = document.getElementById("createPostBtn");
const postContent = document.getElementById("postContent");
const postImage = document.getElementById("postImage");
const postsList = document.getElementById("postsList");

async function loadPosts() {
  postsList.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(doc => {
    const post = doc.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `<strong>${post.username || "Anonymous"}</strong>: ${post.content}<br>${post.imageURL ? `<img src="${post.imageURL}" style="max-width:100%;">` : ""}`;
    postsList.appendChild(div);
  });
}

createPostBtn?.addEventListener("click", async () => {
  if (!postContent.value) return alert("Enter something to post");
  const user = auth.currentUser;
  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username: user.displayName || user.email,
    content: postContent.value,
    imageURL: postImage.value || "",
    timestamp: serverTimestamp()
  });
  postContent.value = "";
  postImage.value = "";
  loadPosts();
});

window.addEventListener("load", loadPosts);
