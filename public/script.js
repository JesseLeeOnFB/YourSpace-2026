import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "feed.html";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});
