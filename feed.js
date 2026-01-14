// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const postBtn = document.getElementById("postBtn");
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

let currentUser;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPosts();
  }
});

// Show preview
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.style.display = "none";
  }
});

postBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  postBtn.disabled = true;
  let text = postTextInput.value.trim();
  let postImageURL = null;
  let postVideoURL = null;

  const file = postFileInput.files[0];

  if (file) {
    // Determine MIME type
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    try {
      const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });

      if (contentType.startsWith("image/")) postImageURL = await getDownloadURL(snapshot.ref);
      else if (contentType.startsWith("video/")) postVideoURL = await getDownloadURL(snapshot.ref);

    } catch (err) {
      alert("Failed to upload file: " + err.message);
      postBtn.disabled = false;
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      text: text || null,
      postImage: postImageURL,
      postVideo: postVideoURL,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    });

    // Reset form
    postTextInput.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";

  } catch (err) {
    alert("Post creation failed: " + err.message);
  }

  postBtn.disabled = false;
});

// Load posts
function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const postEl = document.createElement("div");
      postEl.className = "post";

      const userDisplay = document.createElement("p");
      userDisplay.textContent = `User: ${post.userId}`; // replace with username lookup later
      postEl.appendChild(userDisplay);

      if (post.text) {
        const textEl = document.createElement("p");
        textEl.textContent = post.text;
        postEl.appendChild(textEl);
      }

      if (post.postImage) {
        const img = document.createElement("img");
        img.src = post.postImage;
        img.style.maxWidth = "300px";
        img.style.maxHeight = "300px";
        postEl.appendChild(img);
      }

      if (post.postVideo) {
        const video = document.createElement("video");
        video.src = post.postVideo;
        video.controls = true;
        video.style.maxWidth = "300px";
        video.style.maxHeight = "300px";
        postEl.appendChild(video);
      }

      // Likes & Dislikes
      const likeBtn = document.createElement("button");
      likeBtn.textContent = "👍 " + (post.likes || 0);
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { likes: (post.likes || 0) + 1 });
      });
      postEl.appendChild(likeBtn);

      const dislikeBtn = document.createElement("button");
      dislikeBtn.textContent = "🖕 " + (post.dislikes || 0);
      dislikeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { dislikes: (post.dislikes || 0) + 1 });
      });
      postEl.appendChild(dislikeBtn);

      // Comments
      const commentBtn = document.createElement("button");
      commentBtn.textContent = "💬 Comment";
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (commentText) {
          const postRef = doc(db, "posts", postId);
          await updateDoc(postRef, { comments: arrayUnion({ userId: currentUser.uid, text: commentText, createdAt: new Date() }) });
        }
      });
      postEl.appendChild(commentBtn);

      // Display comments
      if (post.comments && post.comments.length > 0) {
        const commentContainer = document.createElement("div");
        commentContainer.className = "comments";
        post.comments.forEach(c => {
          const cEl = document.createElement("p");
          cEl.textContent = `${c.userId}: ${c.text}`; // replace userId with username later
          commentContainer.appendChild(cEl);
        });
        postEl.appendChild(commentContainer);
      }

      postsContainer.appendChild(postEl);
    });
  });
}
