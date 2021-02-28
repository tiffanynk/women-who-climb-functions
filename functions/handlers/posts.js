const { db } = require('../utilities/admin');

exports.getAllPosts = (request, response) => {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let posts = [];
            data.forEach(document => {
                posts.push({
                    postId: document.id,
                    body: document.data().body,
                    userHandle: document.data().userHandle,
                    createdAt: document.data().createdAt,
                    commentCount: document.data().commentCount,
                    likeCount: document.data().likeCount,
                    userImage: document.data().userImage
                });
            });
            return response.json(posts);
        })
        .catch(error => console.error(error));
}

exports.createPost = (request, response) => {
    if (request.body.body.trim() === '') {
        return response.status(400).json({ body: 'Please enter text'})
    }
    
    const newPost = {
        body: request.body.body,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };
    // persist data
    db.collection('posts')
        .add(newPost)
        .then(document => {
            let createdPost = newPost;
            createdPost.postId = document.id;
            response.json(newPost)
        })
        .catch(error => {
            response.status(500).json({ error: 'Something went wrong!' });
            console.error(error);
        })
}

exports.getPost = (request, response) => {
    let postData = {};

    db.doc(`/posts/${request.params.postId}`)
        .get()
        .then(document => {
            if(!document.exists){
                return response.status(404).json({ error: 'Post not found' })
            }
            postData = document.data()
            postData.postId = document.id
            return db.collection('comments')
                    .orderBy('createdAt', 'desc')
                    .where('postId', '==', request.params.postId)
                    .get()
        })
        .then(data => {
            postData.comments = [];
            data.forEach(doc => {
                postData.comments.push(doc.data())
            })
            return response.json(postData)
        })
        .catch(error => {
            console.error(error)
            response.status(500).json({ error: error.code })
        })
}

exports.postComment = (request, response) => {
    if(request.body.body.trim() === ''){
        return response.status(400).json({ comment: 'Must enter text.' })
    }

    const newComment = {
        body: request.body.body,
        createdAt: new Date().toISOString(),
        postId: request.params.postId,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl
    }

    db.doc(`/posts/${request.params.postId}`)
        .get()
        .then(document => {
            if(!document.exists){
            return response.status(404).json({ error: 'Post not found' })
            }
            return document.ref.update({ commentCount: document.data().commentCount + 1 });
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            response.json(newComment)
        })
        .catch(error => {
            console.error(error)
            response.status(500).json({ error: 'Something went wrong!' })
        })
}

exports.likePost = (request, response) => {
    //check if post exists and if user has already liked it
    const likedPost = db.collection('likes')
        .where('userHandle', '==', request.user.handle)
        .where('postId', '==', request.params.postId)
        .limit(1);
    const postDocument = db.doc(`/posts/${request.params.postId}`);

    let postData;

    postDocument.get()
        .then(document => {
            if(document.exists){
                postData = document.data();
                postData.postId = document.id;
                return likedPost.get();
            } else {
                return response.status(404).json({ error: 'Post not found' });
            }
        })
        .then(data => {
            //adds like
            if(data.empty){
                return db.collection('likes').add({
                    postId: request.params.postId,
                    userHandle: request.user.handle
                })
                .then(() => {
                    postData.likeCount++
                    return postDocument.update({ likeCount: postData.likeCount });
                })
                .then(() => {
                    return response.json(postData)
                })
            } else {
                return response.status(400).json({ error: 'You already liked this post' })
            }
        })
        .catch(error => {
            console.error(error)
            response.status(500).json({ error: error.code })
        })
}

exports.unlikePost = (request, response) => {
    const likedPost = db.collection('likes')
        .where('userHandle', '==', request.user.handle)
        .where('postId', '==', request.params.postId)
        .limit(1);
    const postDocument = db.doc(`/posts/${request.params.postId}`);

    let postData;

    postDocument.get()
        .then(document => {
            if(document.exists){
                postData = document.data();
                postData.postId = document.id;
                return likedPost.get();
            } else {
                return response.status(404).json({ error: 'Post not found' });
            }
        })
        .then(data => {
            if(data.empty){
                return response.status(400).json({ error: 'You have not liked this post!' })
            } else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        postData.likeCount--
                        return postDocument.update({ likeCount: postData.likeCount });
                    })
                    .then(() => {
                        response.json(postData)
                    })
            }
        })
        .catch(error => {
            console.error(error)
            response.status(500).json({ error: error.code })
        })
}

exports.deletePost = (request, response) => {
    const postToDelete = db.doc(`/posts/${request.params.postId}`);
    
    postToDelete.get()
        .then((document) => {
            if (!document.exists) {
                return response.status(404).json({ error: 'post not found' });
            }
            if (document.data().userHandle !== request.user.handle) {
                return response.status(403).json({ error: 'Unauthorized' });
            } else {
                return postToDelete.delete();
            }
        })
        .then(() => {
            response.json({ message: 'Post successfully deleted!' });
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({ error: error.code });
        });
};