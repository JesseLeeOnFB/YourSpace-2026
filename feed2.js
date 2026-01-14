postBtn.onclick = async () => {
  const text = postInput.value.trim();
  let postImageURL = "";

  if (!text && postImageInput.files.length === 0) {
    alert("Write something or attach an image!");
    return;
  }

  if (postImageInput.files.length > 0) {
    try {
      const file = postImageInput.files[0];
      const safeName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
      
      // Upload file
      const uploadSnap = await uploadBytes(storageRef, file);
      
      // Get download URL
      postImageURL = await getDownloadURL(uploadSnap.ref);

    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Only text will post.");
    }
  }

  // Fetch user profile
  const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const profileData = profileSnap.exists() ? profileSnap.data() : {};

  // Add post to Firestore
  await addDoc(collection(db, "posts"), {
    text,
    userId: auth.currentUser.uid,
    displayName: profileData.displayName || "Anonymous",
    photoURL: profileData.photoURL || "",
    postImage: postImageURL,
    likes: 0,
    comments: [],
    createdAt: serverTimestamp()
  });

  postInput.value = "";
  postImageInput.value = "";
};
