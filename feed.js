// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-storage.js";

// Firebase config
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

// DOM elements
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");
const postsContainer = document.getElementById("postsContainer");

// -----------------------------
// Preview file
// -----------------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;

  const type = file.type;
  if (type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (type.startsWith("video/")) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

// -----------------------------
// Create Post
// -----------------------------
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;

  const user = auth.currentUser;
  if (!user) return;

  let postImageURL = null;
  let postVideoURL = null;

  const file = postFileInput.files[0];

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const folder = contentType.startsWith("image/") ? "posts" : "posts";
    const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const url = await getDownloadURL(snapshot.ref);
      if (contentType.startsWith("image/")) postImageURL = url;
      else postVideoURL = url;
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file.");
      postBtn.disabled = false;
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      text: postText.value || null,
      postImage: postImageURL,
      postVideo: postVideoURL,
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      comments: []
    });

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});

// -----------------------------
// Load Feed
// -----------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      // Username & Profile Photo
      const userRef = doc(db, "users", data.userId);
      getDoc(userRef).then(userSnap => {
        const userData = userSnap.data();
        const username = userData?.displayName || "Anonymous";
        const profilePhoto = userData?.photoURL || "";

        postDiv.innerHTML = `
          <div class="postHeader">
            <img src="${profilePhoto}" style="width:40px;height:40px;border-radius:50%;">
            <strong>${username}</strong>
          </div>
          <p>${data.text || ""}</p>
          ${data.postImage ? `<img src="${data.postImage}" style="max-width:300px;">` : ""}
          ${data.postVideo ? `<video controls src="${data.postVideo}" style="max-width:300px;"></video>` : ""}
          <div class="postActions">
            <button class="likeBtn">👍 ${data.likes}</button>
            <button class="dislikeBtn">🖕 ${data.dislikes}</button>
            <button class="commentBtn">Comment</button>
            <button class="deleteBtn">Delete</button>
          </div>
          <div class="commentsContainer"></div>
        `;

        // Append post
        postsContainer.appendChild(postDiv);

        // Action buttons
        const likeBtn = postDiv.querySelector(".likeBtn");
        const dislikeBtn = postDiv.querySelector(".dislikeBtn");
        const deleteBtn = postDiv.querySelector(".deleteBtn");
        const commentBtn = postDiv.querySelector(".commentBtn");
        const commentsContainer = postDiv.querySelector(".commentsContainer");

        // Like
        likeBtn.addEventListener("click", async () => {
          const docRef = doc(db, "posts", docSnap.id);
          await updateDoc(docRef, { likes: (data.likes || 0) + 1 });
        });

        // Dislike
        dislikeBtn.addEventListener("click", async () => {
          const docRef = doc(db, "posts", docSnap.id);
          await updateDoc(docRef, { dislikes: (data.dislikes || 0) + 1 });
        });

        // Delete
        deleteBtn.addEventListener("click", async () => {
          if (user.uid !== data.userId) return alert("You can only delete your own posts.");
          await updateDoc(doc(db, "posts", docSnap.id), { deleted: true }); // soft delete
        });

        // Comment
        commentBtn.addEventListener("click", async () => {
          const commentText = prompt("Enter your comment:");
          if (!commentText) return;
          const docRef = doc(db, "posts", docSnap.id);
          const newComments = data.comments || [];
          newComments.push({ text: commentText, userId: user.uid, createdAt: new Date() });
          await updateDoc(docRef, { comments: newComments });
        });

        // Render comments
        if (data.comments?.length) {
          commentsContainer.innerHTML = "";
          data.comments.forEach(c => {
            const cUserRef = doc(db, "users", c.userId);
            getDoc(cUserRef).then(cSnap => {
              const cData = cSnap.data();
              const cUsername = cData?.displayName || "Anonymous";
              const div = document.createElement("div");
              div.textContent = `${cUsername}: ${c.text}`;
              commentsContainer.appendChild(div);
            });
          });
        }
      });
    });
  });
});
