import { auth, db, storage } from "./firebase.js";
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL
} from "firebase/storage";
import { signOut } from "firebase/auth";

/* DOM */
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

const top10FriendsContainer = document.getElementById("top10FriendsContainer");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

document.getElementById("logoutBtn").onclick = () => signOut(auth);

/* LOAD PROFILE */
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;

  const data = snap.data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  renderWall(data.wallComments || []);
  renderTopFriends(data.top10Friends || []);
  if (data.musicURL) renderMusic(data.musicURL);
}

/* SAVE PROFILE INFO */
saveProfileBtn.onclick = async () => {
  const user = auth.currentUser;
  await updateDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile saved");
};

/* SAVE PROFILE PICTURE */
saveProfilePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/pfp.jpg`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", user.uid), { pfpURL: url });
  profilePfp.src = url;
};

/* WALL */
function renderWall(comments) {
  wallCommentsContainer.innerHTML = "";
  comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `
      <strong>${c.username}</strong>: ${c.text}
      ${c.uid === auth.currentUser.uid ? "<button>Delete</button>" : ""}
    `;
    if (c.uid === auth.currentUser.uid) {
      div.querySelector("button").onclick = async () => {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          wallComments: arrayRemove(c)
        });
        loadProfile();
      };
    }
    wallCommentsContainer.appendChild(div);
  });
}

addWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  await updateDoc(doc(db, "users", user.uid), {
    wallComments: arrayUnion({
      uid: user.uid,
      username: usernameInput.value,
      text,
      time: Date.now()
    })
  });

  wallCommentInput.value = "";
  loadProfile();
};

/* TOP FRIENDS (DISPLAY ONLY FOR NOW) */
function renderTopFriends(friends) {
  top10FriendsContainer.innerHTML = "";
  friends.forEach((f, i) => {
    const div = document.createElement("div");
    div.textContent = `${i + 1}. ${f.username}`;
    top10FriendsContainer.appendChild(div);
  });
}

/* MUSIC */
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  const id = url.includes("youtu")
    ? url.split("v=")[1]?.split("&")[0] || url.split("/").pop()
    : null;

  musicPlayerContainer.innerHTML = id
    ? `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`
    : "";
}

/* INIT */
auth.onAuthStateChanged(user => {
  if (!user) location.href = "login.html";
  else loadProfile();
});
