// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM elements
const profilePicInput = document.getElementById("profilePicInput");
const profilePicSaveBtn = document.getElementById("saveProfilePicBtn");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const themeSelect = document.getElementById("themeSelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const topFriendsInput = document.getElementById("topFriendsInput");
const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");

// NAVIGATION BUTTONS
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
if (logoutBtn) logoutBtn.addEventListener("click", async () => {
  try { await signOut(auth); window.location.href = "index.html"; } 
  catch(err){ console.error(err); alert("Failed to logout"); }
});

// Check auth state and load profile
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return console.log("No user data");

  const userData = userSnap.data();

  // Load inputs
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  themeSelect.value = userData.theme || "default";
  musicInput.value = userData.music || "";
  topFriendsInput.value = userData.topFriends || "";

  // Load profile picture
  if(userData.profilePic){
    document.getElementById("profilePicDisplay").src = userData.profilePic;
  }
});

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("Not signed in");

  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, {
      bio: bioInput.value,
      location: locationInput.value,
      theme: themeSelect.value
    });
    alert("Profile saved!");
  } catch(err){ console.error(err); alert("Failed to save profile"); }
});

// SAVE MUSIC
saveMusicBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("Not signed in");

  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, { music: musicInput.value });
    alert("Music saved!");
  } catch(err){ console.error(err); alert("Failed to save music"); }
});

// SAVE TOP FRIENDS
saveTopFriendsBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("Not signed in");

  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, { topFriends: topFriendsInput.value });
    alert("Top friends saved!");
  } catch(err){ console.error(err); alert("Failed to save top friends"); }
});

// UPLOAD PROFILE PIC
profilePicSaveBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("Not signed in");

  const file = profilePicInput.files[0];
  if(!file) return alert("Select a file");

  const storageRef = ref(storage, `profileImages/${user.uid}/${file.name}`);
  try{
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    await updateDoc(doc(db, "users", user.uid), { profilePic: url });
    document.getElementById("profilePicDisplay").src = url;
    alert("Profile picture saved!");
  } catch(err){ console.error(err); alert("Failed to upload profile picture"); }
});
