// feed.js
import { auth, db, storage } from './firebase-app.js'; // your Firebase imports

// DOM elements
const postText = document.getElementById('postText');
const postFileInput = document.getElementById('postFileInput');
const imagePreview = document.getElementById('imagePreview');
const postBtn = document.getElementById('postBtn');
const postsContainer = document.getElementById('postsContainer');

// Show image/video preview
postFileInput.addEventListener('change', () => {
    const file = postFileInput.files[0];
    if (!file) {
        imagePreview.style.display = 'none';
        return;
    }
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = 'block';
    imagePreview.style.maxWidth = '100%';
    imagePreview.style.borderRadius = '8px';
});

// Create post
postBtn.addEventListener('click', async () => {
    if (!auth.currentUser) {
        alert('You must be logged in to post.');
        return;
    }

    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
        alert('Post cannot be empty!');
        return;
    }

    postBtn.disabled = true;

    let fileURL = null;

    if (file) {
        try {
            const fileRef = storage.ref(`posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            await fileRef.put(file);
            fileURL = await fileRef.getDownloadURL();
        } catch (err) {
            console.error('File upload failed', err);
            alert('Failed to upload file.');
            postBtn.disabled = false;
            return;
        }
    }

    const userSnapshot = await db.collection('users').doc(auth.currentUser.uid).get();
    const displayName = userSnapshot.exists ? userSnapshot.data().displayName || 'Anonymous' : 'Anonymous';

    await db.collection('posts').add({
        userId: auth.currentUser.uid,
        displayName: displayName,
        text: text || null,
        postFile: fileURL || null,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    postText.value = '';
    postFileInput.value = '';
    imagePreview.style.display = 'none';
    postBtn.disabled = false;
});

// Render posts
db.collection('posts').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    postsContainer.innerHTML = '';
    snapshot.forEach(doc => {
        const post = doc.data();
        const postId = doc.id;

        const postDiv = document.createElement('div');
        postDiv.className = 'post-container';

        let mediaHTML = '';
        if (post.postFile) {
            if (post.postFile.match(/\.(mp4|webm|ogg)$/i)) {
                mediaHTML = `<video controls src="${post.postFile}" style="max-width:100%; border-radius:8px;"></video>`;
            } else {
                mediaHTML = `<img src="${post.postFile}" style="max-width:100%; border-radius:8px;" />`;
            }
        }

        const commentsHTML = post.comments && post.comments.length > 0
            ? post.comments.map(c => `<div class="comment"><strong>${c.displayName}:</strong> ${c.text}</div>`).join('')
            : '';

        postDiv.innerHTML = `
            <div class="post-header">
                <span class="post-user clickable" data-userid="${post.userId}">${post.displayName}</span>
            </div>
            <div class="post-text">${post.text || ''}</div>
            ${mediaHTML}
            <div class="post-actions">
                <button class="like-btn" data-id="${postId}">👍 ${post.likes || 0}</button>
                <button class="dislike-btn" data-id="${postId}">🖕 ${post.dislikes || 0}</button>
                <button class="comment-btn" data-id="${postId}">Comment</button>
                <button class="share-btn" data-id="${postId}">Share</button>
                ${post.userId === auth.currentUser.uid ? `<button class="delete-btn" data-id="${postId}">Delete</button>` : ''}
            </div>
            <div class="comments-container">${commentsHTML}</div>
        `;

        postsContainer.appendChild(postDiv);
    });
});

// Event delegation for dynamically created buttons
postsContainer.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const postRef = db.collection('posts').doc(id);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return;
    const postData = postSnap.data();

    // Like
    if (e.target.classList.contains('like-btn')) {
        await postRef.update({ likes: (postData.likes || 0) + 1 });
    }

    // Dislike
    if (e.target.classList.contains('dislike-btn')) {
        await postRef.update({ dislikes: (postData.dislikes || 0) + 1 });
    }

    // Delete
    if (e.target.classList.contains('delete-btn')) {
        await postRef.delete();
    }

    // Comment
    if (e.target.classList.contains('comment-btn')) {
        const commentText = prompt('Enter your comment:');
        if (!commentText) return;
        const userSnap = await db.collection('users').doc(auth.currentUser.uid).get();
        const displayName = userSnap.exists ? userSnap.data().displayName || 'Anonymous' : 'Anonymous';
        await postRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion({ userId: auth.currentUser.uid, displayName, text: commentText })
        });
    }

    // Share
    if (e.target.classList.contains('share-btn')) {
        const url = window.location.href;
        const text = `Check out this post by ${postData.displayName}: ${url}`;
        navigator.clipboard.writeText(text);
        alert('Post link copied to clipboard!');
    }

    // Clickable username
    if (e.target.classList.contains('post-user')) {
        const userid = e.target.dataset.userid;
        window.location.href = `userProfile.html?uid=${userid}`;
    }
});
