import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

const profilePic = document.getElementById("profilePic");
const photoInput = document.getElementById("photoInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicURLInput = document.getElementById("musicURL");
const saveProfileBtn = document.getElementById("saveProfile");
const customCodeInput = document.getElementById("customCode");
const saveCustomBtn = document.getElementById("saveCustom");
const customProfileDiv = document.getElementById("customProfileDiv");
const userPostsContainer = document.getElementById("userPostsContainer");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Auth check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in!");
    window.location.href = "index.html";
    return;
  }

  // Load profile
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const profile = userSnap.exists() ? userSnap.data() : {};

  profilePic.src = profile.photoURL || "https://via.placeholder.com/150";
  displayNameInput.value = profile.displayName || "";
  bioInput.value = profile.bio || "";
  locationInput.value = profile.location || "";
  musicURLInput.value = profile.musicURL || "";
  customCodeInput.value = profile.profileCustom || "";
  customProfileDiv.innerHTML = profile.profileCustom || "";

  // Display user's posts
  const userPostsQuery = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(userPostsQuery, (snapshot) => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="postHeader">
          <img class="postProfilePic" src="${profile.photoURL || ''}" />
          <strong>${profile.displayName || "Anonymous"}</strong>
        </div>
        <p>${data.text}</p>
        <div class="postButtons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          <button class="deleteBtn">Delete</button>
        </div>
        <div class="commentsContainer comments"></div>
      `;
      userPostsContainer.appendChild(postDiv);

      // Like
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
      });

      // Comment
      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.addEventListener("click", async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        const updatedComments = [...(data.comments || []), { text: commentText, user: auth.currentUser.uid }];
        await updateDoc(postRef, { comments: updatedComments });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      });

      // Delete
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });

      // Share
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({
            title: "YourSpace Post",
            text: data.text,
            url: window.location.href
          });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      });
    });
  });
});

// Upload profile photo
photoInput.addEventListener("change", async (e) => {
  const user = auth.currentUser;
  if (!user) return;
  const file = e.target.files[0];
  if (!file) return;

  const storageRef = ref(storage, `profilePictures/${user.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePic.src = url;

  await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    musicURL: musicURLInput.value
  }, { merge: true });
  alert("Profile updated!");
});

// Save custom code
saveCustomBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid), { profileCustom: customCodeInput.value }, { merge: true });
  customProfileDiv.innerHTML = customCodeInput.value;
});

// Navigation
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
