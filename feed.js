import { auth, db, storage } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const createPostBtn = document.getElementById("createPostBtn");
const postContent = document.getElementById("postContent");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => auth.signOut().then(() => window.location.href="index.html"));

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("post");
      div.innerHTML = `
        <p><strong>${post.username}</strong></p>
        <p>${post.content}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" />` : ""}
        ${auth.currentUser.uid === post.userId ? `<button class="deleteBtn" data-id="${docSnap.id}">Delete</button>` : ""}
      `;
      postsContainer.appendChild(div);
    });

    document.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const postId = e.target.dataset.id;
        await deleteDoc(doc(db, "posts", postId));
      });
    });
  });
}

createPostBtn.addEventListener("click", async () => {
  const content = postContent.value;
  if (!content) return alert("Enter something to post!");
  let imageURL = "";
  if (postImageInput.files.length > 0) {
    const file = postImageInput.files[0];
    const storageRef = ref(storage, `postImages/${auth.currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    imageURL = await getDownloadURL(storageRef);
  }
  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  await addDoc(collection(db, "posts"), {
    userId: auth.currentUser.uid,
    username: userDoc.data().username,
    content,
    imageURL,
    timestamp: new Date()
  });
  postContent.value = "";
  postImageInput.value = "";
});

auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "index.html";
  else loadPosts();
});
