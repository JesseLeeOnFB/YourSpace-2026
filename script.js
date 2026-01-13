// File: script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authSection = document.getElementById("authSection");
const welcomeSection = document.getElementById("welcomeSection");
const displayName = document.getElementById("displayName");
const goProfile = document.getElementById("goProfile");
const goFeed = document.getElementById("goFeed");

// Sign Up
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const username = usernameInput.value;
  if(!email || !password || !username){ alert("Fill all fields!"); return; }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: username });
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: email,
      bio: "",
      location: "",
      profilePic: "",
      backgroundCSS: "",
      musicURL: ""
    });
    showWelcome(user);
  } catch(err) { alert(err.message); }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  if(!email || !password){ alert("Fill all fields!"); return; }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showWelcome(userCredential.user);
  } catch(err) { alert(err.message); }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  authSection.style.display = "block";
  welcomeSection.style.display = "none";
});

// Show welcome section
function showWelcome(user){
  authSection.style.display = "none";
  welcomeSection.style.display = "block";
  displayName.textContent = user.displayName || user.email;
}

// Navigation
goProfile.addEventListener("click", ()=>{ window.location.href="profile.html"; });
goFeed.addEventListener("click", ()=>{ window.location.href="feed.html"; });
