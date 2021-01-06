const { admin, db } = require('../utilities/admin');
const { validateSignup, validateLogin, reduceUserDetails } = require('../utilities/validators');
const firebase = require('firebase');
const firebaseConfig = require('../utilities/firebaseConfig');
const { user } = require('firebase-functions/lib/providers/auth');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

firebase.initializeApp(firebaseConfig)

exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle,
    };

    const { valid, errors } = validateSignup(newUser);

    if(!valid){
        return response.status(400).json(errors)
    }

    const noImg = 'no-img.png'

    let token;
    let userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then(document => {
            if(document.exists){
                return response.status(400).json({handle: 'this handle is already taken'})
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(newToken => {
            token = newToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
                userId
            };
            //persist in collection
            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch(error => {
            console.error(error);
            if(error.code === 'auth/email-already-in-use'){
                return response.status(400).json({ email: 'This email is already in use.' });
            } else {
                return response.status(500).json({ error: error.code });
            }
        });
}

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLogin(user);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken()
    })
    .then(token => {
        return response.json({token})
    })
    .catch(error => {
        console.error(error)
        if(error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found'){
            return response.status(403).json({ status: 'Wrong credentials. Please try again.'})
        } else {
            return response.status(500).json({ error: error.code })
        }
    });
}
exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);

    db.doc(`/users/${request.user.handle}`).update(userDetails)
        .then(() => {
            return response.json({ message: 'Your profile has been updated!' }) 
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json({ error: error.code })
        })
}

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};

    db.doc(`/users/${request.user.handle}`).get()
        .then(document => {
            if(document.exists){
                userData.credentials = document.data()
                return db.collection('likes')
                    .where('userHandle', '==', request.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(document => {
                userData.likes.push(document.data())
            })
            return response.json(userData)
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json({ error: error.code })
        })
}
exports.uploadProfileImage = (request, response) => {
    console.log('hit')
    const busboy = new BusBoy({ headers: request.headers });
    let imageFileName;
    let profileImage = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return response.status(400).json({error: 
            'Invalid file type'})
        }
// if my.image.png  need to split by periods
        const imageExtension = filename.split(".")[filename.split(".").length - 1];
        imageFileName = `${Math.round(
            Math.random() * 1000000000000
        ).toString()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        profileImage = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
  //refer back to firebase docs to make sure you know what's happening with each method
        admin.storage()
            .bucket()
            .upload(profileImage.filepath, {
            resumable: false,
            metdata: {
                metadata: {
                    contentType: profileImage.mimetype
                }
            }
        })
        .then(() => {
            //construct image url to add to user
            //?alt media makes it show up on the browser
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${request.user.handle}`).update({ imageUrl })
        })
        .then(() => {
            return response.json({ message: 'Image successfully uploaded!' })
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json({ error: error.code });
        });
    });
    busboy.end(request.rawBody);
};