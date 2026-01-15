import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ELEMENTS
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

const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsList = document.getElementById("topFriendsList");

const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchBtn = document.getElementById("friendSearchBtn");
const friendSearchResults = document.getElementById("friendSearchResults");

const musicPlayer = document.getElementById("musicPlayer");

// LOAD PROFILE DATA
auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = "index.html"; 
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  
  profilePhoto.src = data.profilePic || "";
  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  musicInput.value = data.music || "";
  themeSelect.value = data.theme || "";
  
  // top friends
  topFriendsList.innerHTML = "";
  if (data.topFriends && data.topFriends.length) {
    data.topFriends.forEach(friend => {
      const div = document.createElement("div");
      div.className = "topFriendItem";
      div.textContent = friend;
      topFriendsList.appendChild(div);
    });
  }

  // music player
  if (data.music) musicPlayer.src = data.music;
});

// SAVE PROFILE PHOTO
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first!");
  
  const fileRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: url });
    profilePhoto.src = url;
    alert("Profile photo saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save profile photo.");
  }
});

// SAVE PROFILE INFO
saveProfileInfoBtn.addEventListener("click", async () => {
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile info saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// SAVE THEME
saveThemeBtn.addEventListener("click", async () => {
  try {
    const theme = themeSelect.value;
    await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
    document.body.className = theme;
    alert("Theme saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save theme.");
  }
});

// ADD TOP FRIEND
addTopFriendBtn.addEventListener("click", async () => {
  const friendUsername = topFriendInput.value.trim();
  if (!friendUsername) return alert("Enter a username.");
  
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      topFriends: arrayUnion(friendUsername)
    });
    
    const div = document.createElement("div");
    div.className = "topFriendItem";
    div.textContent = friendUsername;
    topFriendsList.appendChild(div);
    
    topFriendInput.value = "";
  } catch(err) {
    console.error(err);
    alert("Failed to add top friend.");
  }
});

// SEARCH USERS + SEND FRIEND REQUEST
friendSearchBtn.addEventListener("click", async () => {
  const searchName = friendSearchInput.value.trim();
  if (!searchName) return alert("Enter a username to search");

  friendSearchResults.innerHTML = "Searching...";

  try {
    const q = query(collection(db, "users"), where("username", "==", searchName));
    const querySnap = await getDocs(q);

    friendSearchResults.innerHTML = "";

    if (querySnap.empty) {
      friendSearchResults.innerHTML = "No user found.";
      return;
    }

    querySnap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "searchResultItem";
      div.textContent = data.username;

      const addBtn = document.createElement("button");
      addBtn.textContent = "Send Friend Request";
      addBtn.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "users", docSnap.id), {
            friendRequests: arrayUnion(auth.currentUser.uid)
          });
          alert(`Friend request sent to ${data.username}`);
        } catch(err) {
          console.error(err);
          alert("Failed to send friend request.");
        }
      });

      div.appendChild(addBtn);
      friendSearchResults.appendChild(div);
    });

  } catch(err) {
    console.error(err);
    friendSearchResults.innerHTML = "Error searching users.";
  }
});
