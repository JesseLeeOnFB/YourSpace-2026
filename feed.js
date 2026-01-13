import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Elements
const postsContainer = document.getElementById("postsContainer");
const trendingPost = document.getElementById("trendingPost");
const publishBtn = document.getElementById("publishPostBtn");
const postContent = document.getElementById("postContent");
const postImage = document.getElementById("postImage");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
homeBtn.onclick = () => window.location.href = "feed.html";
profileBtn.onclick = () => window.location.href = "profile.html";
logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

// Publish post
publishBtn.addEventListener("click", async () => {
  const content = postContent.value;
  if (!content) return alert("Enter something!");

  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const userDoc = await getDocs(collection(db, "users"));
  let username = user.email;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await userRef.get();
  if (userSnap.exists()) username = userSnap.data().username;

  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username,
    content,
    imageURL: postImage.value || "",
    likes: 0,
    createdAt: new Date()
  });

  postContent.value = "";
  postImage.value = "";
  loadPosts();
});

// Load posts
async function loadPosts() {
  postsContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  let maxLikes = 0;
  let topPostHTML = "";
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const userDocRef = doc(db, "users", data.userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    const div = document.createElement("div");
    div.classList.add("post");
    div.innerHTML = `
      <img src="${userData.profilePicURL || 'placeholder.jpg'}" class="post-profile-pic">
      <h3>${userData.username}</h3>
      <p>${data.content}</p>
      ${data.imageURL ? `<img src="${data.imageURL}"/>` : ""}
      <p>Likes: ${data.likes || 0}</p>
      <button class="likeBtn">👍 Like</button>
    `;

    postsContainer.appendChild(div);

    if (data.likes > maxLikes) {
      maxLikes = data.likes;
      topPostHTML = div.outerHTML;
    }

    // Like button
    div.querySelector(".likeBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      loadPosts();
    });
  }

  trendingPost.innerHTML = topPostHTML;
}

loadPosts();
