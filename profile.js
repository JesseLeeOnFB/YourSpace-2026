// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ------------------- Firebase Init -------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ------------------- DOM Elements -------------------
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const editUsername = document.getElementById("editUsername");
const editBio = document.getElementById("editBio");
const editLocation = document.getElementById("editLocation");

const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const themeSelect = document.getElementById("themeSelect");
const profileMusicURL = document.getElementById("profileMusicURL");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicEmbed = document.getElementById("musicEmbed");

const profilePostsContainer = document.getElementById("profilePostsContainer");

// Nav buttons
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ------------------- Auth State -------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  let profile = {};
  if (userSnap.exists()) profile = userSnap.data();

  // Populate profile
  profilePhoto.src = profile.photoURL || "default-avatar.png";
  editUsername.value = profile.displayName || "";
  editBio.value = profile.bio || "";
  editLocation.value = profile.location || "";
  themeSelect.value = profile.theme || "default";
  profileMusicURL.value = profile.music || "";
  if (profile.music) {
    musicEmbed.innerHTML = `<iframe src="${profile.music}" width="300" height="80" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }

  // Load top friends
  topFriendsList.innerHTML = "";
  (profile.topFriends || []).forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = async () => {
      await updateDoc(userRef, { topFriends: arrayRemove(friend) });
      li.remove();
    };
    li.appendChild(removeBtn);
    topFriendsList.appendChild(li);
  });

  // ------------------- Event Listeners -------------------
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => { await signOut(auth); window.location.href = "index.html"; };

  saveProfilePhotoBtn.onclick = async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return alert("Select a photo first");

    const fileExt = file.name.split(".").pop().toLowerCase();
    let contentType = file.type;
    if (!contentType) {
      if (["jpg","jpeg","png","gif"].includes(fileExt)) contentType = "image/jpeg";
    }

    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const url = await getDownloadURL(snapshot.ref);
      await updateDoc(userRef, { photoURL: url });
      profilePhoto.src = url;
      alert("Profile photo updated!");
    } catch(e) {
      console.error(e);
      alert("Photo upload failed");
    }
  };

  addFriendBtn.onclick = async () => {
    const friendName = addFriendInput.value.trim();
    if (!friendName) return;
    await updateDoc(userRef, { topFriends: arrayUnion(friendName) });
    const li = document.createElement("li");
    li.textContent = friendName;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = async () => {
      await updateDoc(userRef, { topFriends: arrayRemove(friendName) });
      li.remove();
    };
    li.appendChild(removeBtn);
    topFriendsList.appendChild(li);
    addFriendInput.value = "";
  };

  themeSelect.onchange = async () => {
    await updateDoc(userRef, { theme: themeSelect.value });
    document.body.className = themeSelect.value;
  };

  saveMusicBtn.onclick = async () => {
    const url = profileMusicURL.value.trim();
    if (!url) return;
    await updateDoc(userRef, { music: url });
    musicEmbed.innerHTML = `<iframe src="${url}" width="300" height="80" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };

  // ------------------- Load User Posts -------------------
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    profilePostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="postImage" style="max-width:300px; max-height:300px;">`;
      if (data.postVideo) mediaHTML = `<video controls src="${data.postVideo}" class="postVideo" style="max-width:300px; max-height:300px;"></video>`;

      postDiv.innerHTML = `
        <strong>${data.displayName || "Anonymous"}</strong>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div>
          <button class="likeBtn">👍 (${data.likes||0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes||0})</button>
          <button class="deleteBtn">Delete</button>
        </div>
      `;

      profilePostsContainer.appendChild(postDiv);

      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.onclick = async () => { await updateDoc(doc(db, "posts", docSnap.id), { likes: (data.likes||0)+1 }); };

      const dislikeBtn = postDiv.querySelector(".dislikeBtn");
      dislikeBtn.onclick = async () => { await updateDoc(doc(db, "posts", docSnap.id), { dislikes: (data.dislikes||0)+1 }); };

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.onclick = async () => {
        if (confirm("Delete this post?")) {
          await doc(db, "posts", docSnap.id).delete();
        }
      };
    });
  });
});
