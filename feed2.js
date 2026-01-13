// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
  const postInput = document.getElementById("postText");
  const postBtn = document.getElementById("postBtn");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // Optional: add file input for post image
  const postImageInput = document.createElement("input");
  postImageInput.type = "file";
  postImageInput.id = "postImage";
  postImageInput.accept = "image/*";
  document.getElementById("postContainer").appendChild(postImageInput);

  // Navigation
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("You must be logged in!");
      window.location.href = "index.html";
      return;
    }

    // Create post
    postBtn.addEventListener("click", async () => {
      const text = postInput.value.trim();
      const file = postImageInput.files[0];
      if (!text && !file) return alert("Write something or attach an image!");

      try {
        let imageURL = "";
        if (file) {
          const storageRef = ref(storage, `postImages/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          imageURL = await getDownloadURL(storageRef);
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const profile = userSnap.exists() ? userSnap.data() : {};

        await addDoc(collection(db, "posts"), {
          text,
          postImage: imageURL,
          userId: user.uid,
          displayName: profile.displayName || user.email,
          photoURL: profile.photoURL || "",
          createdAt: serverTimestamp(),
          likes: 0,
          comments: [],
        });

        postInput.value = "";
        postImageInput.value = "";
      } catch (err) {
        console.error("Post failed:", err);
        alert("Post failed: " + err.message);
      }
    });

    // Display posts
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(postsQuery, (snapshot) => {
      postsContainer.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const postDiv = document.createElement("div");
        postDiv.classList.add("post");

        const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";
        postDiv.innerHTML = `
          <p><strong>${data.displayName}</strong></p>
          <p>${data.text}</p>
          ${imageHTML}
          <div class="postButtons">
            <button class="likeBtn">Like (${data.likes || 0})</button>
            <button class="commentBtn">Comment</button>
            <button class="shareBtn">Share</button>
            ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
          </div>
          <div class="commentsContainer"></div>
        `;
        postsContainer.appendChild(postDiv);

        // Like
        const likeBtn = postDiv.querySelector(".likeBtn");
        likeBtn.addEventListener("click", async () => {
          const postRef = doc(db, "posts", docSnap.id);
          await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
        });

        // Comment
        const commentBtn = postDiv.querySelector(".commentBtn");
        const commentsContainer = postDiv.querySelector(".commentsContainer");
        commentBtn.addEventListener("click", async () => {
          const commentText = prompt("Enter your comment:");
          if (!commentText) return;
          const postRef = doc(db, "posts", docSnap.id);
          const updatedComments = [...(data.comments || []), { text: commentText, user: user.uid }];
          await updateDoc(postRef, { comments: updatedComments });

          const commentEl = document.createElement("p");
          commentEl.textContent = commentText;
          commentsContainer.appendChild(commentEl);
        });

        // Delete
        const deleteBtn = postDiv.querySelector(".deleteBtn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            if (confirm("Delete this post?")) {
              await deleteDoc(doc(db, "posts", docSnap.id));
            }
          });
        }

        // Share
        const shareBtn = postDiv.querySelector(".shareBtn");
        shareBtn.addEventListener("click", () => {
          if (navigator.share) {
            navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
          } else {
            prompt("Copy this link to share:", window.location.href);
          }
        });
      });
    });

    // Trending post
    setInterval(async () => {
      const postsSnap = await getDocs(collection(db, "posts"));
      let topPost = null;
      postsSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (!topPost || (data.likes || 0) > (topPost.likes || 0)) topPost = data;
      });
      trendingContainer.innerHTML = topPost ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})` : "No posts yet";
    }, 3600*1000); // every hour
  });
});
