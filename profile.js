import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

// DOM
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const backgroundHTMLInput = document.getElementById("backgroundHTML");
const musicURLInput = document.getElementById("musicURL");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const userPostsContainer = document.getElementById("userPostsContainer");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

// Load Profile
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  const userDoc = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDoc);
  if (userSnap.exists()) {
    const data = userSnap.data();
    profilePic.src = data.photoURL || "";
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    backgroundHTMLInput.value = data.backgroundHTML || "";
    musicURLInput.value = data.musicURL || "";
  }

  // Load user's posts
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.displayName || "Anonymous"}</strong></p>
        <p>${data.text}</p>
        <button class="likeBtn">Like (${data.likes || 0})</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
        <button class="deleteBtn">Delete</button>
      `;
      userPostsContainer.appendChild(postDiv);

      // Button events
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", docSnap.id));
      });

      // TODO: Add like, comment, share functionality here
    });
  });
});

// Save Profile
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first");

  let photoURL = profilePic.src;
  if (profilePicInput.files[0]) {
    const fileRef = ref(storage, `users/${user.uid}/profilePic`);
    await uploadBytes(fileRef, profilePicInput.files[0]);
    photoURL = await getDownloadURL(fileRef);
    profilePic.src = photoURL; // update immediately
  }

  await setDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value.trim(),
    bio: bioInput.value.trim(),
    location: locationInput.value.trim(),
    backgroundHTML: backgroundHTMLInput.value.trim(),
    musicURL: musicURLInput.value.trim(),
    photoURL
  }, { merge: true });

  alert("Profile updated!");
});
