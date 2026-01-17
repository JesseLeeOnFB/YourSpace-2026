import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc,
  onSnapshot, query, orderBy, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "YOUR_KEY",
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

const messagesContainer = document.getElementById("messagesContainer");
const sendBtn = document.getElementById("sendMessageBtn");
const textInput = document.getElementById("messageText");
const fileInput = document.getElementById("messageFile");

const params = new URLSearchParams(window.location.search);
const recipientUid = params.get("uid");

let conversationId;

/* Utility */
function buildConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

/* Auth */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  conversationId = buildConversationId(user.uid, recipientUid);

  const metaRef = doc(db, "privateMessages", conversationId, "metadata");
  const metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists()) {
    await setDoc(metaRef, {
      users: [user.uid, recipientUid],
      lastUpdated: new Date()
    });
  }

  loadMessages();
});

/* Load messages */
function loadMessages() {
  const q = query(
    collection(db, "privateMessages", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      const wrapper = document.createElement("div");
      wrapper.className = data.senderId === auth.currentUser.uid
        ? "my-message"
        : "their-message";

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";

      if (data.text) bubble.innerHTML += `<div>${data.text}</div>`;

      if (data.mediaURL) {
        if (data.mediaType === "image") {
          bubble.innerHTML += `<img src="${data.mediaURL}" style="max-width:200px;">`;
        } else {
          bubble.innerHTML += `
            <video controls style="max-width:200px;">
              <source src="${data.mediaURL}">
            </video>`;
        }
      }

      wrapper.appendChild(bubble);
      messagesContainer.appendChild(wrapper);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  });
}

/* Send message */
sendBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) return;

  let mediaURL = "";
  let mediaType = "";

  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const fileRef = ref(
      storage,
      `privateMessages/${conversationId}/${Date.now()}_${file.name}`
    );
    await uploadBytes(fileRef, file);
    mediaURL = await getDownloadURL(fileRef);
  }

  await addDoc(
    collection(db, "privateMessages", conversationId, "messages"),
    {
      senderId: auth.currentUser.uid,
      text,
      mediaURL,
      mediaType,
      createdAt: new Date()
    }
  );

  textInput.value = "";
  fileInput.value = "";
});
