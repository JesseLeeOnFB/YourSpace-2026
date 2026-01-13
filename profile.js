import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

document.addEventListener("DOMContentLoaded", () => {
  const profilePicEl = document.getElementById("profilePic");
  const displayNameEl = document.getElementById("displayName");
  const bioEl = document.getElementById("bio");
  const locationEl = document.getElementById("location");
  const musicPlayer = document.getElementById("musicPlayer");
  const musicSource = document.getElementById("musicSource");

  const newDisplayName = document.getElementById("newDisplayName");
  const newBio = document.getElementById("newBio");
  const newLocation = document.getElementById("newLocation");
  const newMusic = document.getElementById("newMusic");
  const newProfilePic = document.getElementById("newProfilePic");
  const saveProfileBtn = document.getElementById("saveProfileBtn");

  const postsContainer = document.getElementById("postsContainer");
  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = auth.currentUser;
  if (!user) return window.location.href = "index.html";

  // Nav buttons
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  const userRef = doc(db, "users", user.uid);

  // Load profile info
  async function loadProfile() {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      profilePicEl.src = data.photoURL || "https://via.placeholder.com/150";
      displayNameEl.textContent = data.displayName || user.email;
      bioEl.textContent = "Bio: " + (data.bio || "");
      locationEl.textContent = "Location: " + (data.location || "");
      musicSource.src = data.musicURL || "";
      musicPlayer.load();
    }
  }

  loadProfile();

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    const updates = {
      displayName: newDisplayName.value || undefined,
      bio: newBio.value || undefined,
      location: newLocation.value || undefined,
      musicURL: newMusic.value || undefined,
      updatedAt: serverTimestamp()
    };

    if (newProfilePic.files[0]) {
      const file = newProfilePic.files[0];
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      updates.photoURL = await getDownloadURL(storageRef);
    }

    // Remove undefined fields
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    await setDoc(userRef, updates, { merge: true });
    loadProfile();
    alert("Profile updated!");
  });

  // Show user posts
  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.displayName}</strong></p>
        <p>${data.text}</p>
        <button class="deleteBtn">Delete</button>
      `;
      postsContainer.appendChild(postDiv);

      // Delete post
      postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });
    });
  });
});
