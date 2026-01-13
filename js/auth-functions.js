import { auth } from "./config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

signupBtn?.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Account created!");
    window.location.href = "home.html";
  } catch (err) {
    alert(err.message);
  }
});

loginBtn?.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "home.html";
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
