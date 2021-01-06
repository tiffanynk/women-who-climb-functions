const functions = require('firebase-functions');
const express = require('express');
const app = express();
const firebaseAuth = require('./utilities/firebaseAuth');
const { getAllPosts, createPost, getPost, postComment, likePost, unlikePost, deletePost } = require('./handlers/posts');
const { signup, login, uploadProfileImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');
const { db } = require('./utilities/admin');
const cors = require('cors');
app.use(cors());

app.get('/posts', getAllPosts);
app.post('/post', firebaseAuth, createPost);
app.get('/post/:postId', getPost);
app.post('/post/:postId/comment', firebaseAuth, postComment);
app.get('/post/:postId/like', firebaseAuth, likePost);
app.get('/post/:postId/unlike', firebaseAuth, unlikePost);
app.delete('/post/:postId', firebaseAuth, deletePost);

app.post('/signup', signup);
app.post('/login', login);
app.post('/user', firebaseAuth, addUserDetails);
app.post('/user/image', firebaseAuth, uploadProfileImage);
app.get('/user', firebaseAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app)