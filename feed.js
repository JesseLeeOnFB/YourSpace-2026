// feed.js
document.addEventListener("DOMContentLoaded", () => {
  const postsContainer = document.getElementById("postsContainer");
  const postText = document.getElementById("postText");
  const postFileInput = document.getElementById("postFileInput");
  const createPostBtn = document.getElementById("postBtn");

  // NAVIGATION BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      alert("Logged out successfully.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout. Check console.");
    }
  });

  // POST CREATION
  createPostBtn.addEventListener("click", async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Please enter text or choose an image/video.");
      return;
    }

    // Placeholder post object
    const newPost = {
      userId: currentUser.uid,
      username: currentUser.displayName || "Anonymous",
      text: text || null,
      postImage: null,
      postVideo: null,
      likes: 0,
      dislikes: 0,
      comments: []
    };

    // Handle image/video
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type.startsWith("image/")) newPost.postImage = reader.result;
        else if (file.type.startsWith("video/")) newPost.postVideo = reader.result;

        renderPost(newPost, true);
      };
      reader.readAsDataURL(file);
    } else {
      renderPost(newPost, true);
    }

    postText.value = "";
    postFileInput.value = "";
  });

  // RENDER POST FUNCTION
  function renderPost(post, prepend = false) {
    const postDiv = document.createElement("div");
    postDiv.classList.add("postCard");

    // Post header
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("postHeader");
    const usernameEl = document.createElement("h4");
    usernameEl.textContent = post.username;
    usernameEl.style.cursor = "pointer";
    usernameEl.addEventListener("click", () => {
      // Load user's profile page
      window.location.href = `userProfile.html?uid=${post.userId}`;
    });
    headerDiv.appendChild(usernameEl);
    postDiv.appendChild(headerDiv);

    // Post content
    if (post.text) {
      const textEl = document.createElement("p");
      textEl.textContent = post.text;
      postDiv.appendChild(textEl);
    }

    if (post.postImage) {
      const imgEl = document.createElement("img");
      imgEl.src = post.postImage;
      postDiv.appendChild(imgEl);
    }

    if (post.postVideo) {
      const videoEl = document.createElement("video");
      videoEl.src = post.postVideo;
      videoEl.controls = true;
      postDiv.appendChild(videoEl);
    }

    // Post actions
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("postActions");

    const likeBtn = document.createElement("button");
    likeBtn.textContent = `👍 ${post.likes}`;
    likeBtn.addEventListener("click", () => {
      post.likes++;
      likeBtn.textContent = `👍 ${post.likes}`;
    });

    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = `👎 ${post.dislikes}`;
    dislikeBtn.addEventListener("click", () => {
      post.dislikes++;
      dislikeBtn.textContent = `👎 ${post.dislikes}`;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑 Delete";
    deleteBtn.addEventListener("click", () => {
      postDiv.remove();
    });

    const shareBtn = document.createElement("button");
    shareBtn.textContent = "🔗 Share";
    shareBtn.addEventListener("click", () => {
      alert("Post shared! (Demo)");
    });

    actionsDiv.append(likeBtn, dislikeBtn, deleteBtn, shareBtn);
    postDiv.appendChild(actionsDiv);

    // Prepend or append
    if (prepend && postsContainer.firstChild) {
      postsContainer.prepend(postDiv);
    } else {
      postsContainer.appendChild(postDiv);
    }
  }

  // Load demo posts (optional)
  const demoPosts = [
    { userId: "1", username: "DanielleW", text: "Hello world!", likes: 3, dislikes: 0 },
    { userId: "2", username: "JesseW", text: "Loving YourSpace!", likes: 5, dislikes: 1 }
  ];

  demoPosts.forEach(p => renderPost(p));
});
