import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// --- Elements ---
const profileImg = document.getElementById("profileImg");
const profilePicInput = document.getElementById("profilePicInput");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const musicPlayer = document.getElementById("musicPlayer");

const friendSearchInput = document.getElementById("friendSearchInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const topFriendsList = document.getElementById("topFriendsList");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --- Navigation ---
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href="index.html"));

// --- Load Profile ---
onAuthStateChanged(auth, async user => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();

      usernameInput.value = data.username || "";
      locationInput.value = data.location || "";
      bioInput.value = data.bio || "";
      musicInput.value = data.music || "";
      profileImg.src = data.profilePic || "default.png";
      themeSelect.value = data.theme || "default";
      document.body.className = data.theme || "default";

      if (data.music) {
        musicPlayer.src = data.music;
      }

      // Load Top Friends
      topFriendsList.innerHTML = "";
      if (data.topFriends) {
        const friendsArr = data.topFriends.split(",").filter(f => f.trim() !== "");
        friendsArr.forEach(friend => {
          const li = document.createElement("li");
          li.textContent = friend;
          topFriendsList.appendChild(li);
        });
      }
    }
  } else {
    window.location.href = "index.html";
  }
});

// --- Save Profile Info ---
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  try {
    await updateDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile info saved");
    if (musicInput.value) musicPlayer.src = musicInput.value;
  } catch(err) {
    console.error(err);
    alert("Failed to save profile info");
  }
});

// --- Upload Profile Picture ---
profilePicInput.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const file = profilePicInput.files[0];
  if (!file) return;

  try {
    const ext = file.name.split('.').pop();
    const contentType = file.type || (["jpg","jpeg","png","gif"].includes(ext.toLowerCase()) ? "image/jpeg" : "");
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    profileImg.src = downloadURL;
    await updateDoc(doc(db, "users", user.uid), { profilePic: downloadURL });
    alert("Profile picture updated");
  } catch(err) {
    console.error(err);
    alert("Failed to upload profile picture");
  }
});

// --- Save Theme ---
saveThemeBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const selectedTheme = themeSelect.value;
  document.body.className = selectedTheme;

  try {
    await updateDoc(doc(db, "users", user.uid), { theme: selectedTheme });
    alert("Theme saved");
  } catch(err) {
    console.error(err);
    alert("Failed to save theme");
  }
});

// --- Add Friend ---
addFriendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const targetUsername = friendSearchInput.value.trim();
  if (!user) return alert("Not logged in");
  if (!targetUsername) return alert("Enter username");

  try {
    // Search for user by username
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", targetUsername));
    const querySnap = await getDocs(q);
    if (querySnap.empty) return alert("User not found");

    const targetUserDoc = querySnap.docs[0];
    const targetUid = targetUserDoc.id;

    // Send friend request
    await updateDoc(doc(db, "users", targetUid), {
      friendRequests: arrayUnion(auth.currentUser.uid)
    });
    alert(`Friend request sent to ${targetUsername}`);
  } catch(err) {
    console.error(err);
    alert("Failed to send friend request");
  }
});
