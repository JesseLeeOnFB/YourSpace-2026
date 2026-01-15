import { auth, db, storage } from "./firebase.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// NAV BUTTONS
document.addEventListener("DOMContentLoaded", () => {
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch (err) {
      alert("Logout failed: " + err.message);
    }
  });
});

// POST CREATION
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postError = document.getElementById("postError");
const postsContainer = document.getElementById("postsContainer");

postBtn.addEventListener("click", async () => {
  postError.textContent = "";
  if (!auth.currentUser) {
    postError.textContent = "You must be logged in to post!";
    return;
  }

  try {
    let fileURL = null;
    if (postFileInput.files.length > 0) {
      const file = postFileInput.files[0];
      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      fileURL = await getDownloadURL(storageRef);
    }

    // Correct collection reference
    await addDoc(collection(db, "posts"), {
      text: postText.value || "",
      userId: auth.currentUser.uid,
      postFileURL: fileURL || "",
      createdAt: serverTimestamp()
    });

    postText.value = "";
    postFileInput.value = "";
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("videoPreview").style.display = "none";
    postError.style.color = "green";
    postError.textContent = "Post successful ✅";

    loadPosts(); // refresh feed
  } catch (err) {
    postError.style.color = "red";
    postError.textContent = "Post failed: " + err.message;
  }
});

// IMAGE/VIDEO PREVIEW
postFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const imagePreview = document.getElementById("imagePreview");
  const videoPreview = document.getElementById("videoPreview");

  if (file.type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (file.type.startsWith("video/")) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

// LOAD POSTS
async function loadPosts() {
  postsContainer.innerHTML = "";
  try {
    const postsRef = collection(db, "posts"); // <-- fixed
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const postsSnap = await getDocs(q);

    postsSnap.forEach(docSnap => {
      const post = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "postContainer";

      let contentHTML = `<p><strong>${post.userId}</strong>: ${post.text}</p>`;
      if (post.postFileURL) {
        if (post.postFileURL.endsWith(".mp4")) {
          contentHTML += `<video src="${post.postFileURL}" controls style="max-width:100%; border-radius:8px;"></video>`;
        } else {
          contentHTML += `<img src="${post.postFileURL}" style="max-width:100%; border-radius:8px;">`;
        }
      }

      postDiv.innerHTML = contentHTML;
      postsContainer.appendChild(postDiv);
    });
  } catch (err) {
    postError.style.color = "red";
    postError.textContent = "Failed to load posts: " + err.message;
  }
}

// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {
  if (auth.currentUser) {
    loadPosts();
  }
});
