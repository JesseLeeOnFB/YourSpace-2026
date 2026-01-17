firebase.initializeApp({
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app"
});

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);

  const snap = await userRef.get();
  if (snap.exists) {
    const data = snap.data();

    // FORCE load profile fields
    usernameInput.value = data.username ?? "";
    bioInput.value = data.bio ?? "";
    locationInput.value = data.location ?? "";

    if (data.pfpURL) profilePfp.src = data.pfpURL;
    if (data.theme) document.body.className = data.theme;

    loadWall(data.wallComments || []);
  }

  saveProfileBtn.onclick = async () => {
    await userRef.set({
      username: usernameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim()
    }, { merge: true });
  };

  saveProfilePfpBtn.onclick = async () => {
    const file = profilePfpInput.files[0];
    if (!file) return;

    const ref = storage.ref(`profileImages/${user.uid}.jpg`);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    await userRef.set({ pfpURL: url }, { merge: true });
    profilePfp.src = url;
  };

  saveThemeBtn.onclick = async () => {
    document.body.className = themeSelect.value;
    await userRef.set({ theme: themeSelect.value }, { merge: true });
  };

  addWallCommentBtn.onclick = async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;

    const comment = {
      text,
      userId: user.uid,
      username: usernameInput.value || "Anonymous",
      timestamp: Date.now()
    };

    await userRef.update({
      wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
    });

    wallCommentInput.value = "";
    const updated = await userRef.get();
    loadWall(updated.data().wallComments || []);
  };

  function loadWall(comments) {
    wallCommentsContainer.innerHTML = "";

    comments.forEach(c => {
      const div = document.createElement("div");
      div.className = "wall-comment";
      div.innerHTML = `<strong>${c.username || "Anonymous"}</strong>: ${c.text}`;

      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        await userRef.update({
          wallComments: firebase.firestore.FieldValue.arrayRemove(c)
        });
        const refreshed = await userRef.get();
        loadWall(refreshed.data().wallComments || []);
      };

      div.appendChild(del);
      wallCommentsContainer.appendChild(div);
    });
  }
});
