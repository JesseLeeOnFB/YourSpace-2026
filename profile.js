import { getAuth, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// --- DOM Elements ---
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendsList = document.getElementById("topFriendsList");

const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchBtn = document.getElementById("friendSearchBtn");
const friendSearchResults = document.getElementById("friendSearchResults");

const friendRequestsList = document.getElementById("friendRequestsList");

// --- Load current user profile ---
async function loadProfile() {
  const userDoc = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(userDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  musicInput.value = data.music || "";
  profilePhoto.src = data.profilePic || "";
  themeSelect.value = data.theme || "default";

  // Top friends
  topFriendsList.innerHTML = "";
  if (data.topFriends) {
    data.topFriends.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      topFriendsList.appendChild(li);
    });
  }

  // Friend requests
  friendRequestsList.innerHTML = "";
  if (data.friendRequests) {
    data.friendRequests.forEach(async uid => {
      const friendSnap = await getDoc(doc(db, "users", uid));
      if (friendSnap.exists()) {
        const friendData = friendSnap.data();
        const li = document.createElement("li");
        li.textContent = friendData.username;

        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "Accept";
        acceptBtn.addEventListener("click", async () => {
          await updateDoc(userDoc, {
            friends: arrayUnion(uid),
            friendRequests: arrayRemove(uid)
          });
          await updateDoc(doc(db, "users", uid), {
            friends: arrayUnion(auth.currentUser.uid)
          });
          li.remove();
        });

        const declineBtn = document.createElement("button");
        declineBtn.textContent = "Decline";
        declineBtn.addEventListener("click", async () => {
          await updateDoc(userDoc, {
            friendRequests: arrayRemove(uid)
          });
          li.remove();
        });

        li.appendChild(acceptBtn);
        li.appendChild(declineBtn);
        friendRequestsList.appendChild(li);
      }
    });
  }
}

// --- Save Profile Info ---
saveProfileInfoBtn.addEventListener("click", async () => {
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile info saved");
  } catch(err) {
    console.error(err);
    alert("Failed to save profile info");
  }
});

// --- Save Theme ---
saveThemeBtn.addEventListener("click", async () => {
  try {
    const themeValue = themeSelect.value;
    document.body.className = themeValue;
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      theme: themeValue
    });
    alert("Theme saved");
  } catch(err) {
    console.error(err);
    alert("Failed to save theme");
  }
});

// --- Save Profile Photo ---
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      profilePic: downloadURL
    });
    profilePhoto.src = downloadURL;
    alert("Profile photo updated");
  } catch(err) {
    console.error(err);
    alert("Failed to upload profile photo");
  }
});

// --- Friend Search + Send Request ---
friendSearchBtn.addEventListener("click", async () => {
  const searchValue = friendSearchInput.value.trim();
  if (!searchValue) return alert("Enter a username to search");

  friendSearchResults.innerHTML = "";
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", searchValue));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    friendSearchResults.innerHTML = "<li>No users found</li>";
    return;
  }

  querySnapshot.forEach(docSnap => {
    const userData = docSnap.data();
    const userId = docSnap.id;

    if (userId === auth.currentUser.uid) return;

    const li = document.createElement("li");
    li.textContent = userData.username;

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Friend";
    addBtn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "users", userId), {
          friendRequests: arrayUnion(auth.currentUser.uid)
        });
        addBtn.disabled = true;
        addBtn.textContent = "Request Sent";
      } catch(err) {
        console.error(err);
        alert("Failed to send friend request");
      }
    });

    li.appendChild(addBtn);
    friendSearchResults.appendChild(li);
  });
});

// --- Initialize profile ---
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
