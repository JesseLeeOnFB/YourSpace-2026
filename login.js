import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Missing email or password");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("feed.html");
  } catch (err) {
    alert(err.message);
  }
});
