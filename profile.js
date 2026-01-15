// profile.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// HTML Elements
const profilePicImg = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const uploadProfileBtn = document.getElementById("uploadProfileBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");

const musicInput = document.getElementById("musicInput");
const musicSaveBtn = document.getElementById("musicSaveBtn");

const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendsContainer = document.getElementById("topFriendsContainer");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

// Current user doc reference
let userDocRef;

// --- Auth state ---
onAuthStateChanged(auth, async user => {
  if (!user) {
    alert("You must be signed in to view profile.");
    window.location.href = "index.html";
    return;
  }

  userDocRef = doc(db, "users", user.uid);

  // Load profile info
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";

    if (data.profilePic) profilePicImg.src = data.profilePic;

    // Load top friends
    renderTopFriends(data.topFriends || []);
  }
});

// --- Upload Profile Picture ---
uploadProfileBtn.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Select a photo first.");

  const ext = file.name.split(".").pop().toLowerCase();
  let contentType = file.type || (["jpg","jpeg","png","gif"].includes(ext) ? "image/jpeg" : "image/png");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);
    await updateDoc(userDocRef, { profilePic: downloadURL });
    profilePicImg.src = downloadURL;
    alert("Profile photo updated!");
  } catch(err) {
    console.error(err);
    alert("Upload failed, check console.");
  }
});

// --- Save Profile Info ---
saveProfileBtn.addEventListener("click", async () => {
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile info saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// --- Save Music ---
musicSaveBtn.addEventListener("click", async () => {
  try {
    await updateDoc(userDocRef, { music: musicInput.value });
    alert("Music saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save music.");
  }
});

// --- Save Theme ---
saveThemeBtn.addEventListener("click", async () => {
  try {
    await updateDoc(userDocRef, { theme: themeSelect.value });
    document.body.className = themeSelect.value;
    alert("Theme saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save theme.");
  }
});

// --- Top Friends ---
function renderTopFriends(friendsArray) {
  topFriendsContainer.innerHTML = "";
  friendsArray.forEach(friend => {
    const div = document.createElement("div");
    div.textContent = friend;
    topFriendsContainer.appendChild(div);
  });
}

// --- Search Users (basic) ---
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  searchResults.innerHTML = "Searching...";
  const userDoc = await getDoc(doc(db, "users", query));
  if (userDoc.exists()) {
    const data = userDoc.data();
    searchResults.innerHTML = `
      <div>
        <strong>${data.username}</strong>
        <button class="addFriendBtn" data-uid="${query}">Add Friend</button>
      </div>
    `;

    document.querySelector(".addFriendBtn").addEventListener("click", async (e) => {
      const targetUid = e.target.dataset.uid;
      alert(`Send friend request to ${targetUid} (functionality to implement)`);
    });
  } else {
    searchResults.innerHTML = "User not found";
  }
});
