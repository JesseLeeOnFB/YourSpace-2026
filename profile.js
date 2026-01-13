import { auth, db } from "./script.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// DOM Elements
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const themeInput = document.getElementById("themeInput");
const profilePic = document.getElementById("profilePic");
const profileImageUpload = document.getElementById("profileImageUpload");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const userPostsDiv = document.getElementById("userPosts");
const logoutBtn = document.getElementById("logoutBtn");

const storage = getStorage();

auth.onAuthStateChanged(async (user) => {
  if (!user) window.location.href = "index.html";
  else {
    loadProfile(user.uid);
    loadUserPosts(user.uid);
  }
});

// Load profile data
async function loadProfile(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeInput.value = data.theme || "";
    profilePic.src = data.photoURL || "placeholder.png";
    if (data.theme) applyCustomTheme(data.theme);
  }
}

// Apply HTML/CSS customization
function applyCustomTheme(theme) {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = theme;
  document.head.appendChild(styleTag);
}

// Save profile updates
saveProfileBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  let photoURL = profilePic.src;

  if (profileImageUpload.files[0]) {
    const file = profileImageUpload.files[0];
    const storageRef = ref(storage, `profilePictures/${uid}`);
    await uploadBytes(storageRef, file);
    photoURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value,
    theme: themeInput.value,
    photoURL
  }, { merge: true });

  alert("Profile saved!");
  if (themeInput.value) applyCustomTheme(themeInput.value);
});

// Load user's posts
async function loadUserPosts(uid) {
  userPostsDiv.innerHTML = "";
  const q = query(collection(db, "posts"), where("userId", "==", uid), orderBy("timestamp", "desc"));
  const querySnap = await getDocs(q);
  querySnap.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post-card";
    postDiv.innerHTML = `
      <h4>${data.title}</h4>
      <p>${data.content}</p>
      ${data.image ? `<img src="${data.image}" />` : ""}
      <p>By: ${data.username}</p>
      <button class="deletePostBtn">Delete</button>
    `;
    const deleteBtn = postDiv.querySelector(".deletePostBtn");
    deleteBtn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "posts", docSnap.id));
      loadUserPosts(uid);
    });
    userPostsDiv.appendChild(postDiv);
  });
}

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
