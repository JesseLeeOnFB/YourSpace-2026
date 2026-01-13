// -------- IMPORT FIREBASE --------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// -------- DOM ELEMENTS --------
const authSection = document.getElementById("authSection");
const email = document.getElementById("email");
const password = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

const postSection = document.getElementById("postSection");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const postImage = document.getElementById("postImage");
const createPostBtn = document.getElementById("createPostBtn");
const postList = document.getElementById("postList");

const profileDashboard = document.getElementById("profileDashboard");
const displayName = document.getElementById("displayName");
const saveDisplayName = document.getElementById("saveDisplayName");
const profileTheme = document.getElementById("profileTheme");
const saveTheme = document.getElementById("saveTheme");
const profileMusic = document.getElementById("profileMusic");
const saveMusicProfile = document.getElementById("saveMusicProfile");
const logoutBtn = document.getElementById("logoutBtn");

const musicPlayer = document.getElementById("musicPlayer");

// -------- AUTH --------
signupBtn.addEventListener("click", () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Account created!"))
    .catch(err => alert(err.message));
});

loginBtn.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(err => alert(err.message));
});

logoutBtn.addEventListener("click", () => signOut(auth));

// -------- ON LOGIN --------
onAuthStateChanged(auth, async user => {
  if(user){
    authSection.style.display = "none";
    postSection.style.display = "block";
    profileDashboard.style.display = "block";

    await loadProfile();
    await loadUserPosts();
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    profileDashboard.style.display = "none";
  }
});

// -------- PROFILE --------
async function loadProfile(){
  const docRef = doc(db, "profiles", auth.currentUser.uid);
  const docSnap = await getDoc(docRef);
  if(docSnap.exists()){
    displayName.value = docSnap.data().displayName || "";
    profileTheme.value = docSnap.data().theme || "";
    profileMusic.value = docSnap.data().music || "";
    if(profileMusic.value) playMusic(profileMusic.value);
    if(profileTheme.value) document.body.style.background = profileTheme.value;
  }
}

saveDisplayName.addEventListener("click", async () => {
  const docRef = doc(db, "profiles", auth.currentUser.uid);
  await setDoc(docRef, { displayName: displayName.value }, { merge: true });
  alert("Display name saved!");
});

saveTheme.addEventListener("click", async () => {
  const docRef = doc(db, "profiles", auth.currentUser.uid);
  await setDoc(docRef, { theme: profileTheme.value }, { merge: true });
  document.body.style.background = profileTheme.value;
});

saveMusicProfile.addEventListener("click", async () => {
  const docRef = doc(db, "profiles", auth.currentUser.uid);
  await setDoc(docRef, { music: profileMusic.value }, { merge: true });
  playMusic(profileMusic.value);
});

function playMusic(url){
  musicPlayer.innerHTML = `<audio src="${url}" autoplay loop controls></audio>`;
}

// -------- POSTS --------
createPostBtn.addEventListener("click", async () => {
  await addDoc(collection(db, "posts"), {
    uid: auth.currentUser.uid,
    title: postTitle.value,
    content: postContent.value,
    image: postImage.value,
    timestamp: Date.now()
  });
  postTitle.value = "";
  postContent.value = "";
  postImage.value = "";
  await loadUserPosts();
});

async function loadUserPosts(){
  postList.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "posts"));
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.innerHTML = `
      <strong>${data.title}</strong><br>
      ${data.content}<br>
      ${data.image ? `<img src="${data.image}" width="200">` : ""}
      <span class="deleteBtn" data-id="${docSnap.id}">Delete</span>
    `;
    postList.appendChild(postDiv);

    postDiv.querySelector(".deleteBtn").addEventListener("click", async e => {
      await deleteDoc(doc(db, "posts", e.target.dataset.id));
      loadUserPosts();
    });
  });
}


