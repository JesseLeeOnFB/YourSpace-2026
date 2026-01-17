import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function cacheBuster(url) { return url + "?v=" + Date.now(); }

document.addEventListener("DOMContentLoaded", async () => {
  const usernameInput = document.getElementById("usernameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profilePfp = document.getElementById("profilePfp");
  const profilePfpInput = document.getElementById("profilePfpInput");
  const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
  const wallCommentsContainer = document.getElementById("wallCommentsContainer");
  const wallCommentInput = document.getElementById("wallCommentInput");
  const addWallCommentBtn = document.getElementById("addWallCommentBtn");
  const themeSelect = document.getElementById("themeSelect");
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  const customHtmlInput = document.getElementById("customHtmlInput");
  const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
  const customHtmlContainer = document.getElementById("customHtmlContainer");
  const musicUrlInput = document.getElementById("musicUrlInput");
  const loadMusicBtn = document.getElementById("loadMusicBtn");
  const musicIframe = document.getElementById("musicIframe");
  const pauseMusicBtn = document.getElementById("pauseMusicBtn");
  const pmRecipient = document.getElementById("pmRecipient");
  const pmMessage = document.getElementById("pmMessage");
  const sendPmBtn = document.getElementById("sendPmBtn");
  const pmInbox = document.getElementById("pmInbox");

  onAuthStateChanged(auth, async user => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const data = userSnap.exists() ? userSnap.data() : {};

    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    if (data.pfpURL) profilePfp.src = cacheBuster(data.pfpURL);
    if (data.theme) document.body.className = data.theme;
    if (data.customHtml) customHtmlContainer.innerHTML = data.customHtml;

    // Wall comments
    wallCommentsContainer.innerHTML = "";
    if (data.wallComments) {
      data.wallComments.forEach(c => {
        const div = document.createElement("div");
        div.className = "wall-comment";
        div.innerHTML = `<strong class="clickable-username" data-uid="${c.userId}">${c.username || "Unknown"}</strong>: ${c.text} 
          ${(c.userId === user.uid) ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
        if (c.userId === user.uid) {
          div.querySelector(".deleteWallCommentBtn").addEventListener("click", async () => {
            await updateDoc(userRef, { wallComments: arrayRemove(c) });
            location.reload();
          });
        }
        div.querySelector(".clickable-username")?.addEventListener("click", () => {
          alert(`Navigate to profile of UID: ${c.userId}`);
        });
        wallCommentsContainer.appendChild(div);
      });
    }

    // Inbox messages
    pmInbox.innerHTML = "";
    if (data.messages) {
      data.messages.forEach(msg => {
        const div = document.createElement("div");
        div.textContent = `From ${msg.fromUsername}: ${msg.text}`;
        pmInbox.appendChild(div);
      });
    }
  });

  saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
  });

  saveProfilePfpBtn.addEventListener("click", async () => {
    const file = profilePfpInput.files[0]; if (!file) return;
    const user = auth.currentUser;
    const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = cacheBuster(url);
    await updateDoc(doc(db, "users", user.uid), { pfpURL: url });
  });

  addWallCommentBtn.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return;
    const comment = { text: wallCommentInput.value, username: usernameInput.value, userId: user.uid };
    await updateDoc(doc(db, "users", user.uid), { wallComments: arrayUnion(comment) });
    location.reload();
  });

  saveThemeBtn.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return;
    const theme = themeSelect.value;
    document.body.className = theme;
    await updateDoc(doc(db, "users", user.uid), { theme });
  });

  saveCustomHtmlBtn.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return;
    const html = customHtmlInput.value;
    customHtmlContainer.innerHTML = html;
    await updateDoc(doc(db, "users", user.uid), { customHtml: html });
  });

  function convertToEmbed(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.split("v=")[1] || url.split("/").pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes("soundcloud.com")) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    if (url.includes("spotify.com")) return `https://open.spotify.com/embed/${url.split(".com/").pop()}`;
    return url;
  }
  loadMusicBtn.addEventListener("click", () => musicIframe.src = cacheBuster(convertToEmbed(musicUrlInput.value)));
  pauseMusicBtn.addEventListener("click", () => musicIframe.src = "");

  sendPmBtn.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return;
    const recipientName = pmRecipient.value;
    const recipientSnap = await getDocs(collection(db, "users"));
    const recipientDoc = recipientSnap.docs.find(d => d.data().username === recipientName);
    if (!recipientDoc) return alert("User not found");
    const msg = { fromUsername: usernameInput.value, text: pmMessage.value };
    await updateDoc(doc(db, "users", recipientDoc.id), { messages: arrayUnion(msg) });
    pmMessage.value = "";
    alert("Message sent!");
  });
});
