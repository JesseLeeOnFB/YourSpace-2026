import { auth, db, storage } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = auth.currentUser;
  if (!user) return window.location.href = "index.html";

  // NAVIGATION BUTTONS
  document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
  document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  const postText = document.getElementById("postText");
  const postFileInput = document.getElementById("postFileInput");
  const imagePreview = document.getElementById("imagePreview");
  const videoPreview = document.getElementById("videoPreview");
  const postsContainer = document.getElementById("postsContainer");

  // Preview for images/videos
  postFileInput.addEventListener("change", () => {
    const file = postFileInput.files[0];
    if (!file) return;
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

  // CREATE POST
  document.getElementById("postBtn").addEventListener("click", async () => {
    const text = postText.value;
    const file = postFileInput.files[0];
    let postData = { userId: user.uid, text, timestamp: Date.now() };

    if (file) {
      const ref = storage.ref(`posts/${user.uid}/${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      if (file.type.startsWith("image/")) postData.postImage = url;
      if (file.type.startsWith("video/")) postData.postVideo = url;
    }

    await db.collection("posts").add(postData);
    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
    loadPosts();
  });

  // LOAD POSTS
  async function loadPosts() {
    postsContainer.innerHTML = "";
    const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const postDiv = document.createElement("div");
      postDiv.className = "postContainer";

      const author = document.createElement("p");
      author.className = "postAuthor";
      author.textContent = data.userId; // replace with displayName if available

      const text = document.createElement("p");
      text.className = "postText";
      text.textContent = data.text || "";

      postDiv.appendChild(author);
      postDiv.appendChild(text);

      if (data.postImage) {
        const img = document.createElement("img");
        img.src = data.postImage;
        img.className = "postMedia";
        postDiv.appendChild(img);
      }
      if (data.postVideo) {
        const vid = document.createElement("video");
        vid.src = data.postVideo;
        vid.controls = true;
        vid.className = "postMedia";
        postDiv.appendChild(vid);
      }

      // Buttons
      const likeBtn = document.createElement("button"); likeBtn.textContent = "👍";
      const dislikeBtn = document.createElement("button"); dislikeBtn.textContent = "🖕";
      const commentBtn = document.createElement("button"); commentBtn.textContent = "Comment";
      const shareBtn = document.createElement("button"); shareBtn.textContent = "Share";
      const deleteBtn = document.createElement("button"); deleteBtn.textContent = "Delete";

      postDiv.appendChild(likeBtn);
      postDiv.appendChild(dislikeBtn);
      postDiv.appendChild(commentBtn);
      postDiv.appendChild(shareBtn);
      postDiv.appendChild(deleteBtn);

      postsContainer.appendChild(postDiv);
    });
  }

  loadPosts();
});
