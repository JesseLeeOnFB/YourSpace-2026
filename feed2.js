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

/* ---------- FIREBASE INIT ---------- */
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

/* ---------- DOM ---------- */
const postText = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postImageInput = document.getElementById("postImageInput");
const postsContainer = document.getElementById("postsContainer");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = () => signOut(auth);

  /* ---------- CREATE POST ---------- */
postBtn.addEventListener("click", async () => {
  const text = postInput.value.trim();
  const file = postImageInput.files[0];

  if (!text && !file) {
    alert("Write something or attach an image!");
    return;
  }

  let postImageURL = "";

  // Upload image if it exists
  if (file) {
    try {
      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      postImageURL = await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image. Check console.");
      return; // Stop post if image fails
    }
  }

  // Fetch user profile
  const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const profileData = profileSnap.exists() ? profileSnap.data() : {};

  // Add post
  await addDoc(collection(db, "posts"), {
    text: text || "",
    userId: auth.currentUser.uid,
    displayName: profileData.displayName || "Anonymous",
    photoURL: profileData.photoURL || "",
    postImage: postImageURL,
    likes: 0,
    comments: [],
    createdAt: serverTimestamp()
  });

  postInput.value = "";
  postImageInput.value = "";
});

  /* ---------- FEED ---------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postRef = doc(db, "posts", docSnap.id);

      const postDiv = document.createElement("div");
      postDiv.className = "post";

      postDiv.innerHTML = `
        <p>${data.text || ""}</p>
        ${data.postImage ? `<img src="${data.postImage}" class="postImage">` : ""}
        <button type="button" class="likeBtn">❤️ ${data.likes || 0}</button>
        <button type="button" class="commentBtn">💬 Comment</button>
        <div class="comments"></div>
      `;

      const likeBtn = postDiv.querySelector(".likeBtn");
      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsDiv = postDiv.querySelector(".comments");

      /* ---------- RENDER COMMENTS ---------- */
      (data.comments || []).forEach(c => {
        const p = document.createElement("p");
        p.textContent = c.text;
        commentsDiv.appendChild(p);
      });

      /* ---------- LIKE ---------- */
      likeBtn.onclick = async () => {
        await updateDoc(postRef, { likes: increment(1) });
      };

      /* ---------- COMMENT ---------- */
      commentBtn.onclick = async () => {
        const text = prompt("Comment:");
        if (!text) return;

        await updateDoc(postRef, {
          comments: arrayUnion({
            text,
            uid: user.uid,
            createdAt: Date.now()
          })
        });
      };

      postsContainer.appendChild(postDiv);
    });
  });
});
