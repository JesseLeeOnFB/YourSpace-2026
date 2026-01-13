import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const username = usernameInput.value || "Anonymous";
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      username: username,
      bio: "",
      location: "",
      profilePic: "",
      theme: "",
      music: ""
    });
    window.location.href = "feed.html";
  } catch (err) {
    alert(err.message);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    const userCred = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "feed.html";
  } catch (err) {
    alert(err.message);
  }
});
