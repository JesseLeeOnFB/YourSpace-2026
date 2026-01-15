import { auth, db, storage } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { onAuthStateChanged, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const $ = id => document.getElementById(id);

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const data = snap.data();

  $("usernameInput").value = data.username || "";
  $("locationInput").value = data.location || "";
  $("bioInput").value = data.bio || "";
  $("musicInput").value = data.music || "";
  $("themeSelect").value = data.theme || "default";

  if (data.profilePic) $("profilePhoto").src = data.profilePic;

  document.body.className = data.theme || "default";

  loadTopFriends(data.topFriends || []);
  loadUserPosts(user.uid);
});

$("saveProfileBtn").onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, "users", user.uid), {
    username: $("usernameInput").value.trim(),
    location: $("locationInput").value.trim(),
    bio: $("bioInput").value.trim(),
    music: $("musicInput").value.trim()
  }, { merge: true });

  alert("Profile saved");
};

$("savePhotoBtn").onclick = async () => {
  const file = $("profilePhotoInput").files[0];
  if (!file) return alert("No file selected");

  const user = auth.currentUser;
  const refPic = ref(storage, `profileImages/${user.uid}/profile.jpg`);

  await uploadBytes(refPic, file);
  const url = await getDownloadURL(refPic);

  await updateDoc(doc(db, "users", user.uid), { profilePic: url });
  $("profilePhoto").src = url;
};

$("saveThemeBtn").onclick = async () => {
  const theme = $("themeSelect").value;
  document.body.className = theme;

  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
};

$("searchFriendBtn").onclick = async () => {
  const username = $("friendSearchInput").value.trim();
  if (!username) return;

  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);

  $("searchResults").innerHTML = "";
  snap.forEach(docSnap => {
    const div = document.createElement("div");
    div.textContent = docSnap.data().username;
    const btn = document.createElement("button");
    btn.textContent = "Add Friend";
    btn.onclick = () => addFriend(docSnap.id);
    div.appendChild(btn);
    $("searchResults").appendChild(div);
  });
};

async function addFriend(friendId) {
  const refUser = doc(db, "users", auth.currentUser.uid);
  const snap = await getDoc(refUser);
  const friends = snap.data().friends || [];
  if (!friends.includes(friendId)) friends.push(friendId);
  await updateDoc(refUser, { friends });
  alert("Friend added");
}

function loadTopFriends(list) {
  $("topFriendsList").innerHTML = "";
  list.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    $("topFriendsList").appendChild(li);
  });
}

async function loadUserPosts(uid) {
  const q = query(collection(db, "posts"), where("userId", "==", uid));
  const snap = await getDocs(q);
  snap.forEach(p => {
    const d = document.createElement("div");
    d.textContent = p.data().text || "";
    $("userPosts").appendChild(d);
  });
}

$("homeBtn").onclick = () => location.href = "feed.html";
$("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};
