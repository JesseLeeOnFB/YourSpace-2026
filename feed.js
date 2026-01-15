import { auth, db, storage, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, ref, uploadBytes, getDownloadURL, onAuthStateChanged } from './firebase.js';

let currentUser;
const postsContainer = document.getElementById('postsContainer');
const postText = document.getElementById('postText');
const postFileInput = document.getElementById('postFileInput');
const imagePreview = document.getElementById('imagePreview');

// AUTH CHECK
onAuthStateChanged(auth, async user => {
    if (!user) {
        alert('You must be logged in');
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        await loadPosts();
    }
});

// NAVIGATION
document.getElementById('homeBtn')?.addEventListener('click', () => window.location.href = 'feed.html');
document.getElementById('profileBtn')?.addEventListener('click', () => window.location.href = 'profile.html');
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = 'index.html';
});

// IMAGE PREVIEW
postFileInput.addEventListener('change', () => {
    const file = postFileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = 'block';
});

// CREATE POST
document.getElementById('postBtn')?.addEventListener('click', async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];
    let mediaUrl = null;
    let mediaType = null;

    if (!text && !file) return alert('Add text or media to post');

    if (file) {
        mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(storageRef);
    }

    const post = {
        userId: currentUser.uid,
        username: currentUser.displayName || 'Anonymous',
        text: text || null,
        postImage: mediaType === 'image' ? mediaUrl : null,
        postVideo: mediaType === 'video' ? mediaUrl : null,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: Date.now()
    };

    await addDoc(collection(db, 'posts'), post);
    postText.value = '';
    postFileInput.value = '';
    imagePreview.style.display = 'none';
    await loadPosts();
});

// LOAD POSTS
async function loadPosts() {
    postsContainer.innerHTML = '';
    const postsSnap = await getDocs(collection(db, 'posts'));
    const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    posts.sort((a,b) => b.createdAt - a.createdAt);

    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'postContainer';

        let mediaHTML = '';
        if (post.postImage) mediaHTML = `<img src="${post.postImage}" class="postMedia">`;
        if (post.postVideo) mediaHTML = `<video src="${post.postVideo}" class="postMedia" controls></video>`;

        postDiv.innerHTML = `
            <div class="postHeader">
                <span class="username clickable" data-uid="${post.userId}">${post.username}</span>
            </div>
            <div class="postText">${post.text || ''}</div>
            <div class="postMediaContainer">${mediaHTML}</div>
            <div class="postActions">
                <button class="likeBtn">👍 ${post.likes}</button>
                <button class="dislikeBtn">🖕 ${post.dislikes}</button>
                <button class="commentBtn">Comment (${post.comments.length})</button>
                <button class="shareBtn">Share</button>
                ${post.userId === currentUser.uid ? '<button class="deleteBtn">Delete</button>' : ''}
            </div>
            <div class="commentsContainer"></div>
        `;
        postsContainer.appendChild(postDiv);

        // BUTTONS
        const likeBtn = postDiv.querySelector('.likeBtn');
        const dislikeBtn = postDiv.querySelector('.dislikeBtn');
        const commentBtn = postDiv.querySelector('.commentBtn');
        const deleteBtn = postDiv.querySelector('.deleteBtn');
        const shareBtn = postDiv.querySelector('.shareBtn');

        likeBtn?.addEventListener('click', async () => {
            await updateDoc(doc(db, 'posts', post.id), { likes: post.likes + 1 });
            await loadPosts();
        });

        dislikeBtn?.addEventListener('click', async () => {
            await updateDoc(doc(db, 'posts', post.id), { dislikes: post.dislikes + 1 });
            await loadPosts();
        });

        commentBtn?.addEventListener('click', () => {
            const commentText = prompt('Enter comment:');
            if (!commentText) return;
            post.comments.push({ text: commentText, username: currentUser.displayName || 'Anonymous' });
            updateDoc(doc(db, 'posts', post.id), { comments: post.comments });
            loadPosts();
        });

        shareBtn?.addEventListener('click', () => {
            prompt('Copy this link to share post:', `${window.location.origin}/feed.html#${post.id}`);
        });

        deleteBtn?.addEventListener('click', async () => {
            if (!confirm('Delete this post?')) return;
            await deleteDoc(doc(db, 'posts', post.id));
            await loadPosts();
        });

        // USERNAME CLICK -> PROFILE
        postDiv.querySelectorAll('.username.clickable').forEach(el => {
            el.addEventListener('click', () => {
                window.location.href = `userProfile.html?uid=${el.dataset.uid}`;
            });
        });
    });
}
