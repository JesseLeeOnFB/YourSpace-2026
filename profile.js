// profile.js – FIXED wall comments posting and deletion, removed custom HTML

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, query, getDocs, setDoc, onSnapshot, orderBy, serverTimestamp, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser;
let viewingUserId;
let isOwnProfile = true;

const urlParams = new URLSearchParams(window.location.search);
viewingUserId = urlParams.get('userId');

document.getElementById("homeBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("messagesBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  window.location.href = "login.html";
};

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    if (!viewingUserId) {
      viewingUserId = user.uid;
      isOwnProfile = true;
    } else {
      isOwnProfile = (viewingUserId === user.uid);
    }
    initProfile();
  }
});

async function initProfile() {
  await loadProfile();
  setupThemeControls();
  setupMusicPlayer();
  setupTopFriends();
  setupCommentsWall();
  setupProfilePictureUpload();
  setupEditProfile();
  
  if (!isOwnProfile) {
    document.getElementById("editProfileBtn").style.display = "none";
    document.getElementById("sendMessageBtn").style.display = "inline-block";
    document.getElementById("searchFriendBtn").style.display = "none";
    document.getElementById("searchFriendInput").style.display = "none";
    document.getElementById("themeSelect").disabled = true;
    document.getElementById("applyThemeBtn").disabled = true;
    document.querySelectorAll(".music-input").forEach(input => input.disabled = true);
    document.querySelectorAll(".add-music-btn").forEach(btn => btn.disabled = true);
  }
}

async function loadProfile() {
  const userDoc = await getDoc(doc(db, "users", viewingUserId));
  if (!userDoc.exists()) {
    const defaultUsername = currentUser.email.split("@")[0];
    await setDoc(doc(db, "users", viewingUserId), {
      username: defaultUsername,
      photoURL: "default-avatar.png",
      bio: "",
      location: "",
      theme: "default-theme",
      music: ["", "", "", ""],
      autoplay: true,
      topFriends: []
    });
    return loadProfile();
  }

  const data = userDoc.data();
  const username = data.username || currentUser.email.split("@")[0];

  document.getElementById("displayName").textContent = username;
  document.getElementById("location").textContent = data.location || "📍 No location set";
  document.getElementById("bio").textContent = data.bio || "No bio yet";
  document.getElementById("profilePic").src = data.photoURL || "default-avatar.png";

  if (data.theme) {
    document.body.className = data.theme;
  }

  if (data.music) {
    loadMusicPlayer(data.music, data.autoplay !== false);
  }

  if (data.topFriends) {
    renderTopFriends(data.topFriends);
  }

  loadComments();
}

function setupProfilePictureUpload() {
  if (!isOwnProfile) return;

  document.getElementById("changePfpBtn").onclick = () => {
    document.getElementById("profilePicInput").click();
  };

  document.getElementById("profilePicInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const progressDiv = document.createElement("div");
    progressDiv.className = "upload-progress";
    progressDiv.innerHTML = `<p>Uploading...</p><progress value="0" max="100"></progress><p class="percent">0%</p>`;
    document.body.appendChild(progressDiv);

    try {
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on("state_changed", (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressDiv.querySelector("progress").value = progress;
        progressDiv.querySelector(".percent").textContent = Math.round(progress) + "%";
      });

      await uploadTask;
      const url = await getDownloadURL(uploadTask.snapshot.ref);

      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
      loadProfile();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      progressDiv.remove();
    }
  };
}

function setupEditProfile() {
  if (!isOwnProfile) return;

  const modal = document.getElementById("editProfileModal");
  const closeBtn = modal.querySelector(".close-modal");

  document.getElementById("editProfileBtn").onclick = async () => {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const data = userDoc.data();

    document.getElementById("usernameInput").value = data.username || "";
    document.getElementById("locationInput").value = data.location || "";
    document.getElementById("bioInput").value = data.bio || "";

    modal.style.display = "block";
  };

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("saveProfileBtn").onclick = async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      username: document.getElementById("usernameInput").value,
      location: document.getElementById("locationInput").value,
      bio: document.getElementById("bioInput").value
    });
    modal.style.display = "none";
    loadProfile();
  };
}

function setupThemeControls() {
  if (!isOwnProfile) return;

  document.getElementById("applyThemeBtn").onclick = async () => {
    const theme = document.getElementById("themeSelect").value;
    document.body.className = theme;
    await updateDoc(doc(db, "users", currentUser.uid), { theme });
  };

  document.getElementById("resetThemeBtn").onclick = async () => {
    document.body.className = "default-theme";
    document.getElementById("themeSelect").value = "default-theme";
    await updateDoc(doc(db, "users", currentUser.uid), { theme: "default-theme" });
  };
}

function setupMusicPlayer() {
  if (!isOwnProfile) return;

  const addButtons = document.querySelectorAll(".add-music-btn");
  addButtons.forEach(btn => {
    btn.onclick = async () => {
      const slot = parseInt(btn.dataset.slot);
      const input = document.querySelector(`.music-input[data-slot="${slot}"]`);
      const url = input.value.trim();

      if (!url) return;

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const music = userDoc.data().music || ["", "", "", ""];
      music[slot] = url;

      await updateDoc(doc(db, "users", currentUser.uid), { music });
      loadProfile();
    };
  });

  const removeButtons = document.querySelectorAll(".remove-music-btn");
  removeButtons.forEach(btn => {
    btn.onclick = async () => {
      const slot = parseInt(btn.dataset.slot);
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const music = userDoc.data().music || ["", "", "", ""];
      music[slot] = "";

      await updateDoc(doc(db, "users", currentUser.uid), { music });
      loadProfile();
    };
  });

  document.getElementById("autoplayToggle").onchange = async (e) => {
    await updateDoc(doc(db, "users", currentUser.uid), { autoplay: e.target.checked });
  };
}

function loadMusicPlayer(musicArray, autoplay) {
  const container = document.getElementById("musicPlayerContainer");
  container.innerHTML = "";

  musicArray.forEach((url, index) => {
    if (!url) return;

    const playerHtml = getEmbedCode(url, autoplay && index === 0);
    if (playerHtml) {
      const div = document.createElement("div");
      div.className = "music-embed";
      div.innerHTML = playerHtml;
      container.appendChild(div);
    }

    const removeBtn = document.querySelector(`.remove-music-btn[data-slot="${index}"]`);
    if (removeBtn && isOwnProfile) removeBtn.style.display = "inline-block";
  });
}

function getEmbedCode(url, autoplay) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const idMatch = url.match(/(?:v=|\.be\/)([\w-]+)/);
    if (!idMatch) return "";
    return `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${idMatch[1]}?autoplay=${autoplay ? 1 : 0}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }

  if (url.includes("spotify.com")) {
    const idMatch = url.match(/track\/(\w+)/);
    if (!idMatch) return "";
    return `<iframe src="https://open.spotify.com/embed/track/${idMatch[1]}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  }

  if (url.includes("soundcloud.com")) {
    return `<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${autoplay}"></iframe>`;
  }

  return `<p><a href="${url}" target="_blank">${url}</a></p>`;
}

function setupTopFriends() {
  if (!isOwnProfile) return;

  document.getElementById("searchFriendBtn").onclick = async () => {
    const searchTerm = document.getElementById("searchFriendInput").value.trim();
    if (!searchTerm) return;

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    const resultsDiv = document.getElementById("searchResults");
    resultsDiv.innerHTML = "<p>Searching...</p>";

    let found = false;
    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      const username = (user.username || "").toLowerCase();
      
      if (docSnap.id === currentUser.uid) return;
      
      if (username.includes(searchTerm.toLowerCase())) {
        if (!found) resultsDiv.innerHTML = "";
        found = true;
        
        const div = document.createElement("div");
        div.className = "search-result";
        div.innerHTML = `
          <img src="${user.photoURL || 'default-avatar.png'}" alt="${user.username}">
          <span>${user.username}</span>
          <button class="add-friend-btn" data-uid="${docSnap.id}">Add to Top 10</button>
        `;
        resultsDiv.appendChild(div);

        div.querySelector(".add-friend-btn").onclick = () => addToTopFriends(docSnap.id, user);
      }
    });

    if (!found) {
      resultsDiv.innerHTML = "<p>No users found</p>";
    }
  };

  const friendsList = document.getElementById("topFriendsContainer");
  new Sortable(friendsList, {
    animation: 150,
    onEnd: async () => {
      const newOrder = [];
      friendsList.querySelectorAll(".top-friend").forEach(el => {
        newOrder.push({
          uid: el.dataset.uid,
          username: el.dataset.username,
          photoURL: el.dataset.photourl
        });
      });
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: newOrder });
      renderTopFriends(newOrder);
    }
  });
}

async function addToTopFriends(uid, userData) {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const topFriends = userDoc.data().topFriends || [];

  if (topFriends.length >= 10) {
    return alert("You can only have 10 top friends!");
  }

  if (topFriends.some(f => f.uid === uid)) {
    return alert("Already in your top friends!");
  }

  topFriends.push({
    uid,
    username: userData.username,
    photoURL: userData.photoURL || "default-avatar.png"
  });

  await updateDoc(doc(db, "users", currentUser.uid), { topFriends });
  document.getElementById("searchResults").innerHTML = "";
  document.getElementById("searchFriendInput").value = "";
  loadProfile();
}

function renderTopFriends(friends) {
  const container = document.getElementById("topFriendsContainer");
  container.innerHTML = "";

  if (friends.length === 0) {
    container.innerHTML = "<p class='empty-friends'>No top friends yet. Search and add some!</p>";
    return;
  }

  friends.forEach((friend, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.dataset.uid = friend.uid;
    div.dataset.username = friend.username;
    div.dataset.photourl = friend.photoURL;

    div.innerHTML = `
      <span class="rank">#${index + 1}</span>
      <img src="${friend.photoURL}" alt="${friend.username}" class="friend-avatar">
      <a href="profile.html?userId=${friend.uid}" class="friend-name">${friend.username}</a>
      ${isOwnProfile ? `<button class="remove-friend-btn" data-uid="${friend.uid}">✕</button>` : ''}
    `;

    if (isOwnProfile) {
      div.querySelector(".remove-friend-btn").onclick = () => removeFromTopFriends(friend.uid);
    }

    container.appendChild(div);
  });
}

async function removeFromTopFriends(uid) {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const topFriends = userDoc.data().topFriends || [];
  const updated = topFriends.filter(f => f.uid !== uid);
  await updateDoc(doc(db, "users", currentUser.uid), { topFriends: updated });
  loadProfile();
}

function setupCommentsWall() {
  document.getElementById("addCommentBtn").onclick = async () => {
    const text = document.getElementById("commentInput").value.trim();
    if (!text) {
      alert("Please enter a comment");
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      await addDoc(collection(db, "users", viewingUserId, "wallComments"), {
        text,
        authorId: currentUser.uid,
        authorName: userData?.username || currentUser.email.split("@")[0],
        authorPhoto: userData?.photoURL || "default-avatar.png",
        createdAt: serverTimestamp()
      });

      document.getElementById("commentInput").value = "";
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Error posting comment: " + err.message);
    }
  };
}

function loadComments() {
  const commentsRef = collection(db, "users", viewingUserId, "wallComments");
  const q = query(commentsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    const container = document.getElementById("wallCommentsContainer");
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p class='empty-comments'>No comments yet. Be the first!</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const comment = docSnap.data();
      const div = document.createElement("div");
      div.className = "wall-comment";

      const time = comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleString() : "just now";
      const canDelete = (comment.authorId === currentUser.uid) || isOwnProfile;

      div.innerHTML = `
        <div class="comment-header">
          <img src="${comment.authorPhoto || 'default-avatar.png'}" class="comment-avatar">
          <div>
            <strong><a href="profile.html?userId=${comment.authorId}">${comment.authorName}</a></strong>
            <small>${time}</small>
          </div>
        </div>
        <p>${comment.text}</p>
        ${canDelete ? `<button class="delete-wall-comment" data-id="${docSnap.id}">🗑️</button>` : ''}
      `;

      if (canDelete) {
        div.querySelector(".delete-wall-comment").onclick = async () => {
          if (confirm("Delete this comment?")) {
            try {
              await deleteDoc(doc(db, "users", viewingUserId, "wallComments", docSnap.id));
            } catch (err) {
              console.error("Error deleting comment:", err);
              alert("Error deleting comment: " + err.message);
            }
          }
        };
      }

      container.appendChild(div);
    });
  }, (err) => {
    console.error("Error loading comments:", err);
  });
}

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.onclick = () => {
    document.getElementById("editProfileModal").style.display = "none";
  };
});
