// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

/* -------------------- Auth & Feed -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation buttons
  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
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

    postBtn.disabled = true; // prevent double click
    let postImageURL = "";

    try {
      if (file) {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
          alert("Only JPEG, PNG, or GIF images are allowed.");
          postBtn.disabled = false;
          return;
        }

        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
        postImageURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile data
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profile = profileSnap.exists() ? profileSnap.data() : {};

      // Add post to Firestore
      await addDoc(collection(db, "posts"), {
        text,
        postImage: postImageURL,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      // Reset UI
      postInput.value = "";
      postImageInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Failed to create post. Check console for errors.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- DISPLAY POSTS -------------------- */
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const post = document.createElement("div");
      post.className = "post";

      // Post innerHTML
      post.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postImage">` : ""}
        <div class="postButtons">
          <button class="likeBtn">❤️ ${data.likes || 0}</button>
          <button class="dislikeBtn">💔 ${data.dislikes || 0}</button>
          ${user.uid === data.userId ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      // Like
      const likeBtn = post.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };

      // Dislike
      const dislikeBtn = post.querySelector(".dislikeBtn");
      dislikeBtn.onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };

      // Delete
      const delBtn = post.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // TODO: Add comments UI later if desired
    });
  });
});
