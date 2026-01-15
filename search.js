import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

searchBtn.addEventListener("click", async () => {
  const term = searchInput.value.trim();
  if (!term) return;

  const q = query(collection(db, "users"), where("username", "==", term));
  const querySnapshot = await getDocs(q);

  searchResults.innerHTML = "";
  if (querySnapshot.empty) {
    searchResults.textContent = "No users found";
    return;
  }

  querySnapshot.forEach(docSnap => {
    const user = docSnap.data();
    const div = document.createElement("div");
    div.textContent = user.username;
    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Profile";
    viewBtn.onclick = () => window.location.href = `profile.html?uid=${docSnap.id}`;
    div.appendChild(viewBtn);
    searchResults.appendChild(div);
  });
});
