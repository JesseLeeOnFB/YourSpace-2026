// feed.js
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

const notifyEmailCheck = document.getElementById("notifyEmail");
const notifyBrowserCheck = document.getElementById("notifyBrowser");

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

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* Nav buttons */
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
    const notifyEmail = notifyEmailCheck.checked;
    const notifyBrowser = notifyBrowserCheck.checked;

    if (!text && !file) {
      alert("Write something or attach an image/video.");
      return;
    }

    postBtn.disabled = true;

    let postImageURL = "";
    try {
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);

        const snapshot = await uploadBytes(storageRef, file, {
          contentType: file.type || "image/jpeg"
        });

        postImageURL = await getDownloadURL(snapshot.ref);
      }

      // Get user profile info
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create post document
      await addDoc(collection(db, "posts"), {
        text,
        postImage: postImageURL,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: extractMentions(text),
        createdAt: serverTimestamp(),
        notifications: {
          email: notifyEmail,
          browser: notifyBrowser
        }
      });

      postInput.value = "";
      postImageInput.value = "";
      imagePreview.style.display = "none";

    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- FEED LISTEN -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const post = document.createElement("div");
      post.className = "post";

      post.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postImage">` : ""}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">🔗</button>
          ${user.uid === data.userId ? `<button class="deleteBtn">🗑️</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      // LIKE
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      // DISLIKE
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: increment(1)
        });
      };

      // COMMENT
      post.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;

        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ text: commentText, user: user.uid })
        });

        const commentsContainer = post.querySelector(".commentsContainer");
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      };

      // DELETE
      const del = post.querySelector(".deleteBtn");
      if (del) {
        del.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // SHARE
      post.querySelector(".shareBtn").onclick = () => {
        navigator.clipboard.writeText(window.location.href + "?post=" + docSnap.id);
        alert("Post link copied to clipboard!");
      };
    });
  });
});

/* -------------------- Helpers -------------------- */
function extractMentions(text) {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}
