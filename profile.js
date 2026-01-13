import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const themeInput = document.getElementById("themeInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileError = document.getElementById("profileError");

const myPostsContainer = document.getElementById("myPostsContainer");

// Navigation
homeBtn.addEventListener("click", () => location.href="feed.html");
logoutBtn.addEventListener("click", () => auth.signOut().then(()=> location.href="index.html"));

// Auth check
onAuthStateChanged(auth, async user => {
    if (!user) location.href = "index.html";
    else {
        loadProfile();
        loadMyPosts();
    }
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
    try {
        let photoURL = profilePicPreview.src;
        if (profilePicInput.files[0]) {
            const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, profilePicInput.files[0]);
            photoURL = await getDownloadURL(storageRef);
        }
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            username: usernameInput.value,
            bio: bioInput.value,
            location: locationInput.value,
            music: musicInput.value,
            theme: themeInput.value,
            photoURL: photoURL
        });
        profileError.textContent = "Profile saved!";
    } catch(err) {
        profileError.textContent = err.message;
    }
});

// Load profile
async function loadProfile() {
    const docRef = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        usernameInput.value = data.username || "";
        bioInput.value = data.bio || "";
        locationInput.value = data.location || "";
        musicInput.value = data.music || "";
        themeInput.value = data.theme || "";
        profilePicPreview.src = data.photoURL || "assets/placeholder.png";
    }
}

// Load user posts
async function loadMyPosts() {
    myPostsContainer.innerHTML = "";
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.userId === auth.currentUser.uid) {
            const postEl = document.createElement("div");
            postEl.className = "post";
            postEl.innerHTML = `
                <h4>${data.title}</h4>
                <p>${data.content}</p>
                ${data.image ? `<img src="${data.image}" class="post-img">` : ""}
                <button class="deleteBtn">Delete</button>
            `;
            const deleteBtn = postEl.querySelector(".deleteBtn");
            deleteBtn.addEventListener("click", async () => {
                await deleteDoc(doc(db, "posts", docSnap.id));
                loadMyPosts();
            });
            myPostsContainer.appendChild(postEl);
        }
    });
}
