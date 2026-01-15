import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const profilePhoto = document.getElementById("profilePhoto");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const friendRequestsContainer = document.getElementById("friendRequestsContainer");
const friendsContainer = document.getElementById("friendsContainer");
const topFriendsContainer = document.getElementById("topFriendsContainer");

// Load profile info
onAuthStateChanged(auth, async user => {
  if (!user) return;
  const userDoc = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  // Profile info
  profilePhoto.src = data.profilePic || "";
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.music || "";
  document.body.className = data.theme || "default";

  // Friends
  renderFriendRequests(data.friendRequests || "");
  renderFriends(data.friends || "");
  renderTopFriends(data.topFriends || "");
});

// SAVE PROFILE PHOTO
saveProfilePhotoBtn.addEventListener("click", async () => {
  if (!profilePhotoInput.files[0]) return alert("Select a photo first");
  const file = profilePhotoInput.files[0];
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: url });
  profilePhoto.src = url;
  alert("Profile photo updated!");
});

// SAVE PROFILE INFO
saveProfileInfoBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
});

// SAVE THEME
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
  alert("Theme saved!");
});

// FRIEND REQUESTS & FRIENDS
function renderFriendRequests(requestsString) {
  friendRequestsContainer.innerHTML = "";
  const requests = requestsString ? requestsString.split(",") : [];
  requests.forEach(async userId => {
    if (!userId) return;
    const userSnap = await getDoc(doc(db, "users", userId));
    const data = userSnap.data();
    const div = document.createElement("div");
    div.textContent = data.username || "Anonymous";

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Accept";
    acceptBtn.onclick = () => handleFriendRequest(userId, true);

    const declineBtn = document.createElement("button");
    declineBtn.textContent = "Decline";
    declineBtn.onclick = () => handleFriendRequest(userId, false);

    div.appendChild(acceptBtn);
    div.appendChild(declineBtn);
    friendRequestsContainer.appendChild(div);
  });
}

async function handleFriendRequest(senderId, accept) {
  const currentUserDoc = doc(db, "users", auth.currentUser.uid);
  const senderDoc = doc(db, "users", senderId);
  const currentData = (await getDoc(currentUserDoc)).data();
  const senderData = (await getDoc(senderDoc)).data();

  const currentFriends = (currentData.friends || "").split(",").filter(f => f);
  const senderFriends = (senderData.friends || "").split(",").filter(f => f);

  let updatedRequests = (currentData.friendRequests || "").split(",").filter(f => f && f !== senderId);

  if (accept) {
    if (!currentFriends.includes(senderId)) currentFriends.push(senderId);
    if (!senderFriends.includes(auth.currentUser.uid)) senderFriends.push(auth.currentUser.uid);
  }

  await updateDoc(currentUserDoc, { friends: currentFriends.join(","), friendRequests: updatedRequests.join(",") });
  await updateDoc(senderDoc, { friends: senderFriends.join(",") });

  renderFriendRequests(updatedRequests.join(","));
  renderFriends(currentFriends.join(","));
}

// RENDER FRIENDS / TOP FRIENDS
function renderFriends(friendsString) {
  friendsContainer.innerHTML = "";
  const friends = friendsString ? friendsString.split(",") : [];
  friends.forEach(async userId => {
    if (!userId) return;
    const userSnap = await getDoc(doc(db, "users", userId));
    const data = userSnap.data();
    const div = document.createElement("div");
    div.textContent = data.username || "Anonymous";

    const addTopBtn = document.createElement("button");
    addTopBtn.textContent = "Add to Top Friends";
    addTopBtn.onclick = async () => {
      const topFriends = (await getDoc(doc(db, "users", auth.currentUser.uid))).data().topFriends || "";
      const topArray = topFriends.split(",").filter(f => f);
      if (!topArray.includes(userId) && topArray.length < 10) {
        topArray.push(userId);
        await updateDoc(doc(db, "users", auth.currentUser.uid), { topFriends: topArray.join(",") });
        renderTopFriends(topArray.join(","));
      }
    };

    div.appendChild(addTopBtn);
    friendsContainer.appendChild(div);
  });
}

function renderTopFriends(topString) {
  topFriendsContainer.innerHTML = "";
  const topArray = topString ? topString.split(",") : [];
  topArray.forEach(async userId => {
    if (!userId) return;
    const userSnap = await getDoc(doc(db, "users", userId));
    const data = userSnap.data();
    const div = document.createElement("div");
    div.textContent = data.username || "Anonymous";
    topFriendsContainer.appendChild(div);
  });
}
