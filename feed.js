import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

function renderPost(post, postId) {
  const div = document.createElement("div");
  div.className = "post-card";

  const time = post.createdAt?.toDate().toLocaleString() || "Just now";

  div.innerHTML = `
    <strong>${post.username || "Anonymous"}</strong>
    <small>${time}</small>
    <p>${post.text || ""}</p>
    ${post.mediaURL ? `<img src="${post.mediaURL}" class="post-media">` : ""}
  `;

  postsContainer.appendChild(div);
}

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, snap => {
    postsContainer.innerHTML = "";
    snap.forEach(docSnap => renderPost(docSnap.data(), docSnap.id));
  });
}

postBtn.onclick = async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  let mediaURL = "";

  if (file) {
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];

  await addDoc(collection(db, "posts"), {
    text,
    mediaURL,
    username,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postFileInput.value = "";
};

function setupNotifications(user) {
  const notifBtn = document.getElementById("notificationsBtn");
  const modal = document.getElementById("notificationsModal");
  const closeBtn = document.getElementById("closeNotifModal");
  const list = document.getElementById("notificationsList");
  const count = document.getElementById("notifCount");

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", user.uid),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, snap => {
    list.innerHTML = "";
    const unread = snap.docs.filter(d => !d.data().read).length;
    count.textContent = unread;
    count.style.display = unread ? "inline" : "none";

    snap.forEach(d => {
      const n = d.data();
      const el = document.createElement("div");
      el.className = `notification-item ${n.read ? "read" : "unread"}`;
      el.textContent = n.type;
      list.appendChild(el);
    });
  });

  notifBtn.onclick = () => modal.style.display = "block";
  closeBtn.onclick = () => modal.style.display = "none";
}

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadPosts();
    setupNotifications(user);
  }
});
