import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Elements
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const profilePicInput = document.getElementById("profilePicInput");
const customHTMLInput = document.getElementById("customHTMLInput");
const saveBtn = document.getElementById("saveProfileBtn");
const userPostsContainer = document.getElementById("userPostsContainer");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
homeBtn.onclick = () => window.location.href = "feed.html";
profileBtn.onclick = () => window.location.href = "profile.html";
logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

// Load profile
async function loadProfile() {
  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDocs(collection(db, "users"));
  const userData = (await userRef.get()).data();

  usernameInput.value = userData.username || "";
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  musicInput.value = userData.musicURL || "";
  profilePicInput.value = userData.profilePicURL || "";
  customHTMLInput.value = userData.customHTML || "";

  loadUserPosts();
}

// Save profile
saveBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    musicURL: musicInput.value,
    profilePicURL: profilePicInput.value,
    customHTML: customHTMLInput.value
  }, { merge: true });

  alert("Profile saved!");
  loadProfile();
});

// Load user posts
async function loadUserPosts() {
  userPostsContainer.innerHTML = "";
  const user = auth.currentUser;
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.userId === user.uid) {
      const div = document.createElement("div");
      div.classList.add("post");
      div.innerHTML = `
        <img src="${data.profilePicURL || 'placeholder.jpg'}" class="post-profile-pic">
        <h3>${data.username}</h3>
        <p>${data.content}</p>
        ${data.imageURL ? `<img src="${data.imageURL}"/>` : ""}
      `;
      userPostsContainer.appendChild(div);
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "index.html";
  else loadProfile();
});
