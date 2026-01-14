// feed2.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

/* -------------------- Firebase -------------------- */
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
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* ---------- Nav ---------- */
  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = () =>
    signOut(auth).then(() => window.location.href = "index.html");

  /* ---------- Create Post ---------- */
  postBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text && postImageInput.files.length === 0) {
      alert("Write something or attach an image");
      return;
    }

    let postImageURL = "";
    if (postImageInput.files.length > 0) {
      const file = postImageInput.files[0];
      const storageRef = ref(
        storage,
        `posts/${user.uid}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      postImageURL = await getDownloadURL(storageRef);
    }

    const profileSnap = await getDoc(doc(db, "users", user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};

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
  });

  /* ---------- Feed ---------- */
  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(postsQuery, (snapshot) => {
    const scrollY = window.scrollY;
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post";

      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || "default-avatar.png"}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>

        <p>${data.text || ""}</p>

        ${data.postImage ? `<img src="${data.postImage}" class="postImage">` : ""}

        <div class="postButtons">
          <button type="button" class="likeBtn">Like (${data.likes || 0})</button>
          <button type="button" class="commentBtn">Comment</button>
          <button type="button" class="shareBtn">Share</button>
          ${user.uid === data.userId
            ? `<button type="button" class="deleteBtn">Delete</button>`
            : ""}
        </div>

        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postDiv);

      /* ----- Comments render ----- */
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      (data.comments || []).forEach(c => {
        const p = document.createElement("p");
        p.textContent = c.text;
        commentsContainer.appendChild(p);
      });

      /* ----- Like ----- */
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      /* ----- Comment ----- */
      const commentBtn = postDiv.querySelector(".commentBtn");
      commentBtn.onclick = async () => {
        const text = prompt("Enter your comment");
        if (!text) return;

        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ text, user: user.uid })
        });
      };

      /* ----- Delete ----- */
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      /* ----- Share ----- */
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.onclick = () => {
        navigator.share
          ? navigator.share({ title: "YourSpace", text: data.text })
          : alert("Sharing not supported");
      };
    });

    window.scrollTo(0, scrollY);
  });
});
