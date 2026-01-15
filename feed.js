// feed.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const imagePreview = document.getElementById("imagePreview");

// Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadPosts();
});

// Show image preview
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = "block";
  } else {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
});

// Create a new post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not signed in!");

  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post something!");

  let fileURL = "";
  if (file) {
    const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  try {
    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      text: text || "",
      postMedia: fileURL || "",
      mediaType: file ? file.type.split("/")[0] : "",
      timestamp: Date.now(),
      likes: 0,
      dislikes: 0,
      comments: [],
    });
    postText.value = "";
    postFileInput.value = "";
    imagePreview.src = "";
    imagePreview.style.display = "none";
  } catch (err) {
    console.error("Failed to create post:", err);
    alert("Post failed. Check console.");
  }
});

// Load posts
function loadPosts() {
  const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const postEl = document.createElement("div");
      postEl.className = "post-container";

      let mediaHTML = "";
      if (data.postMedia) {
        if (data.mediaType === "image") {
          mediaHTML = `<img src="${data.postMedia}" alt="Post image" class="post-media">`;
        } else if (data.mediaType === "video") {
          mediaHTML = `<video controls class="post-media"><source src="${data.postMedia}" type="video/mp4"></video>`;
        }
      }

      postEl.innerHTML = `
        <p class="post-user">${data.userId}</p>
        <p class="post-text">${data.text}</p>
        ${mediaHTML}
        <div class="post-actions">
          <button class="like-btn">👍 ${data.likes}</button>
          <button class="dislike-btn">🖕 ${data.dislikes}</button>
          <button class="comment-btn">💬 Comment</button>
          <button class="share-btn">🔗 Share</button>
          ${auth.currentUser.uid === data.userId ? '<button class="delete-btn">🗑️ Delete</button>' : ''}
        </div>
        <div class="comments-container"></div>
      `;

      // Actions
      const likeBtn = postEl.querySelector(".like-btn");
      const dislikeBtn = postEl.querySelector(".dislike-btn");
      const deleteBtn = postEl.querySelector(".delete-btn");

      likeBtn?.addEventListener("click", async () => {
        await doc.ref.update({ likes: data.likes + 1 });
      });

      dislikeBtn?.addEventListener("click", async () => {
        await doc.ref.update({ dislikes: data.dislikes + 1 });
      });

      deleteBtn?.addEventListener("click", async () => {
        await doc.ref.delete();
      });

      postsContainer.appendChild(postEl);
    });
  });
}
