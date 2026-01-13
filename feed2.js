import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, query, orderBy, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ---------------- Firebase config ----------------
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

// ---------------- DOM elements ----------------
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");
const trendingContainer = document.getElementById("trendingPost");

// ---------------- Auth check ----------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in");
    window.location.href = "index.html";
    return;
  }

  // ---------------- Post button ----------------
  postBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text && postImageInput.files.length === 0) return alert("Write something or attach an image!");

    let postImageURL = "";
    try {
      if (postImageInput.files.length > 0) {
        const file = postImageInput.files[0];
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        postImageURL = await getDownloadURL(storageRef);
      }

      // Fetch user profile for displayName/photo
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "posts"), {
        text,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        postImage: postImageURL,
        likes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      postInput.value = "";
      postImageInput.value = "";
    } catch (err) {
      console.error("Error posting:", err);
      alert("Failed to post. Check console for details.");
    }
  });

  // ---------------- Navigation ----------------
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // ---------------- Listen to posts ----------------
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(async (docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      // Post image HTML
      const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";

      // Post inner HTML
      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
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

      // ---------------- Button functionality ----------------

      // Like
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        try {
          const postRef = doc(db, "posts", docSnap.id);
          const postSnap = await getDoc(postRef);
          const currentLikes = postSnap.data().likes || 0;
          await updateDoc(postRef, { likes: currentLikes + 1 });
        } catch (err) {
          console.error("Error liking post:", err);
        }
      });

      // Comment
      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        try {
          const postRef = doc(db, "posts", docSnap.id);
          const postSnap = await getDoc(postRef);
          const updatedComments = [...(postSnap.data().comments || []), { text: commentText, userId: user.uid }];
          await updateDoc(postRef, { comments: updatedComments });

          const commentEl = document.createElement("p");
          commentEl.textContent = commentText;
          commentsContainer.appendChild(commentEl);
        } catch (err) {
          console.error("Error commenting:", err);
        }
      });

      // Delete
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            try {
              await deleteDoc(doc(db, "posts", docSnap.id));
            } catch (err) {
              console.error("Error deleting post:", err);
            }
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

      // Render comments initially
      if (data.comments && data.comments.length > 0) {
        data.comments.forEach(c => {
          const commentEl = document.createElement("p");
          commentEl.textContent = c.text;
          commentsContainer.appendChild(commentEl);
        });
      }
    });
  });
});
