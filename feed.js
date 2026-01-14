// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* -------------------- DOM -------------------- */
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

/* -------------------- Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  if (file.type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  } else if (file.type.startsWith("video/")) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
});

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* Nav */
  homeBtn.onclick = () => (window.location.href = "feed.html");
  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];
    if (!text && !file) {
      alert("Write something or attach a file.");
      return;
    }

    postBtn.disabled = true;

    let postImage = "";
    let postVideo = "";

    try {
      if (file) {
        // Determine content type
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(fileRef, file, { contentType });
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImage = downloadURL;
        if (contentType.startsWith("video/")) postVideo = downloadURL;
      }

      // Firestore post
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        displayName: user.email.split("@")[0], // simple display name
        text,
        postImage,
        postVideo,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp(),
        mentions: [] // optional future feature
      });

      // Reset
      postText.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- FEED -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const post = document.createElement("div");
      post.className = "post";

      // Content
      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postMedia" style="max-width:400px; max-height:400px;">`;
      if (data.postVideo) mediaHTML = `<video controls class="postMedia" style="max-width:400px; max-height:400px;"><source src="${data.postVideo}"></video>`;

      post.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬 Comment</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;
      postsContainer.appendChild(post);

      // Likes
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislikes
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Comments
      const commentsContainer = post.querySelector(".commentsContainer");
      post.querySelector(".commentBtn").onclick = () => {
        const commentBox = document.createElement("textarea");
        commentBox.placeholder = "Write a comment...";
        const submitComment = document.createElement("button");
        submitComment.textContent = "Post";
        commentBox.style.display = "block";
        commentsContainer.appendChild(commentBox);
        commentsContainer.appendChild(submitComment);

        submitComment.onclick = async () => {
          const commentText = commentBox.value.trim();
          if (!commentText) return;
          await updateDoc(doc(db, "posts", docSnap.id), {
            comments: arrayUnion({ user: user.email.split("@")[0], text: commentText, createdAt: serverTimestamp() })
          });
          commentBox.remove();
          submitComment.remove();
        };
      };

      // Delete
      const del = post.querySelector(".deleteBtn");
      if (del) {
        del.onclick = async () => {
          if (confirm("Delete post?")) await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      // Render existing comments
      if (data.comments && data.comments.length > 0) {
        data.comments.forEach(c => {
          const cEl = document.createElement("p");
          cEl.textContent = `${c.user}: ${c.text}`;
          commentsContainer.appendChild(cEl);
        });
      }
    });
  });
});
