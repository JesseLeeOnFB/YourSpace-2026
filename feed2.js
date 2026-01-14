// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc,
  getDoc, updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Image Preview -------------------- */
postImageInput.addEventListener("change", () => {
  const file = postImageInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

/* -------------------- Auth & Navigation -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- CREATE POST -------------------- */
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postImageInput.files[0];

    if (!text && !file) {
      alert("Write something or attach an image.");
      return;
    }

    postBtn.disabled = true;

    let postImageURL = "";

    try {
      // Upload image
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const path = `posts/${user.uid}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, path);

        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
        postImageURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Add post
      await addDoc(collection(db, "posts"), {
        text,
        postImage: postImageURL,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      postInput.value = "";
      postImageInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error("Post failed:", err);
      alert("Failed to post. See console for details.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- LOAD FEED -------------------- */
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";

      // Preserve MySpace features: custom HTML, music embeds, backgrounds, themes
      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <div class="postBody">
          ${data.text || ""}
          ${imageHTML}
          ${data.customHTML || ""}
          ${data.musicEmbed || ""}
        </div>
        <div class="postActions">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          ${data.userId === user.uid ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postDiv);

      // LIKE
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // COMMENT
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { comments: arrayUnion({ text: commentText, user: user.uid }) });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        postDiv.querySelector(".commentsContainer").appendChild(commentEl);
      };

      // DELETE
      const delBtn = postDiv.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }
    });
  });
});
