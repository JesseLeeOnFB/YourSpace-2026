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

  const displayNameInput = document.getElementById("displayName");
  const bioInput = document.getElementById("bio");
  const locationInput = document.getElementById("location");
  const profilePicImg = document.getElementById("profilePic");
  const profilePicInput = document.getElementById("profilePicInput");
  const topFriendsContainer = document.getElementById("topFriendsContainer");
  const themeSelect = document.getElementById("themeSelect");
  const musicLinkInput = document.getElementById("musicLink");
  const musicContainer = document.getElementById("musicContainer");
  const wallContainer = document.getElementById("wallContainer");

  const userRef = db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  if (doc.exists) {
    const data = doc.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    themeSelect.value = data.theme || "";
    musicLinkInput.value = data.music || "";
    profilePicImg.src = data.profilePic || "default-avatar.png";
    // Top friends
    topFriendsContainer.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(f => {
        const div = document.createElement("div");
        div.textContent = f;
        topFriendsContainer.appendChild(div);
      });
    }
  }

  // SAVE PROFILE INFO
  document.getElementById("saveProfileBtn").addEventListener("click", async () => {
    await userRef.update({
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile updated!");
  });

  // SAVE PROFILE PICTURE
  document.getElementById("saveProfilePicBtn").addEventListener("click", async () => {
    const file = profilePicInput.files[0];
    if (!file) return alert("Select a photo first!");
    const ref = storage.ref(`profileImages/${user.uid}/${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    profilePicImg.src = url;
    await userRef.update({ profilePic: url });
    alert("Profile photo updated!");
  });

  // SAVE THEME
  document.getElementById("saveThemeBtn").addEventListener("click", async () => {
    const theme = themeSelect.value;
    await userRef.update({ theme });
    document.body.className = theme || "default";
    alert("Theme saved!");
  });

  // SAVE MUSIC
  document.getElementById("saveMusicBtn").addEventListener("click", async () => {
    const url = musicLinkInput.value;
    await userRef.update({ music: url });
    // Embed player
    musicContainer.innerHTML = `<iframe width="300" height="80" src="${url}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  });

  // WALL COMMENTS (simplified)
  document.getElementById("postWallCommentBtn").addEventListener("click", async () => {
    const text = document.getElementById("wallCommentInput").value;
    if (!text) return;
    const wallRef = userRef.collection("wall");
    await wallRef.add({ text, author: user.displayName || "Anonymous", timestamp: Date.now() });
    const div = document.createElement("div");
    div.textContent = `${user.displayName || "Anonymous"}: ${text}`;
    wallContainer.appendChild(div);
  });
});
