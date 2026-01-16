import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  const protectedPages =
    path.endsWith("feed.html") ||
    path.endsWith("profile.html");

  if (!user && protectedPages) {
    window.location.replace("login.html");
    return;
  }

  if (user && path.endsWith("login.html")) {
    window.location.replace("feed.html");
    return;
  }
});

// LOGOUT BUTTON (WORKS EVERYWHERE)
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
  });
}
