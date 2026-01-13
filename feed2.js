import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");

  // Optional image input (create in feed.html)
  let postImageInput = document.getElementById("postImage");
  if (!postImageInput) {
    postImageInput = document.createElement("input");
    postImageInput.type = "file";
    postImageInput.id = "postImage";
    document.getElementById("postContainer").appendChild(postImageInput);
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("You must be logged in!");
      window.location.href = "index.html";
      return;
    }

    // POST BUTTON
    postBtn.addEventListener("click", async () => {
      const text = postInput.value.trim();
      if (!text && (!postImageInput.files || postImageInput.files.length === 0)) {
        return alert("Write something or add an image first!");
      }

      let postImageURL = "";
      if (postImageInput.files.length > 0) {
        const file = postImageInput.files[0];
        const storageRef = ref(storage, `postImages/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        postImageURL = await getDownloadURL(storageRef);
      }

      try {
        await addDoc(collection(db, "posts"), {
          text,
          userId: user.uid,
          displayName: user.displayName || user.email,
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          likes: 0,
          comments: [],
          postImage: postImageURL
        });
        postInput.value = "";
        postImageInput.value = "";
      } catch (err) {
        alert("Post failed: " + err.message);
      }
    });

    // LOAD FEED
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(postsQuery, (snapshot) => {
      postsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const postDiv = document.createElement("div");
        postDiv.classList.add("post");

        const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";

        postDiv.innerHTML = `
          <p><strong>${data.displayName}</strong></p>
          <p>${data.text}</p>
          ${imageHTML}
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        `;

        postsContainer.appendChild(postDiv);

        // BUTTONS
        const likeBtn = postDiv.querySelector(".likeBtn");
        likeBtn.addEventListener("click", async () => {
          const postRef = doc(db, "posts", docSnap.id);
          await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
        });

        const commentBtn = postDiv.querySelector(".commentBtn");
        commentBtn.addEventListener("click", async () => {
          const commentText = prompt("Enter comment:");
          if (!commentText) return;
          const postRef = doc(db, "posts", docSnap.id);
          const updatedComments = [...(data.comments || []), { text: commentText, user: user.uid }];
          await updateDoc(postRef, { comments: updatedComments });
        });

        const shareBtn = postDiv.querySelector(".shareBtn");
        shareBtn.addEventListener("click", () => {
          if (navigator.share) navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
          else prompt("Copy this link:", window.location.href);
        });

        const deleteBtn = postDiv.querySelector(".deleteBtn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            if (confirm("Delete this post?")) {
              await deleteDoc(doc(db, "posts", docSnap.id));
            }
          });
        }
      });
    });
  });
});
