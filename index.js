const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://resqroute-e1a35.firebaseio.com',
});

// Initialize Firestore
const db = admin.firestore();

// Serve static files from the 'views' directory
app.use(express.static('views'));

// Parse URL-encoded bodies for form data
app.use(bodyParser.urlencoded({ extended: true }));

// Sign-up route
app.post('/signup', async (req, res) => {
    const { fullname, userid, email, usertype, licenseno, password, confirmpassword } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email address format');
    }

    // Check if password and confirm password match
    if (password !== confirmpassword) {
        return res.status(400).send('Passwords do not match');
    }

    try {
        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in Firebase Authentication
        await admin.auth().createUser({
            email,
            password: hashedPassword
        });

        // Save user details to Firestore
        await db.collection('users').doc(email).set({
            fullname,
            userid,
            email,
            usertype,
            licenseno
        });

        res.redirect('/login.html');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password, usertype } = req.body;

    try {
        // Verify user credentials with Firebase Authentication
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Assuming authentication is successful
        console.log('User authenticated successfully');

        // Add redirection logic based on user type
        if (usertype === 'type1') {
            res.redirect('/type1dashboard.html'); // Redirect to Type 1 dashboard
        } else if (usertype === 'type2') {
            res.redirect('/type2dashboard.html'); // Redirect to Type 2 dashboard
        } else {
            res.status(404).send('Dashboard not found');
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(401).send('Invalid Credentials');
    }
});

// Password reset route (POST request to handle form submission)
app.post('/resetpassword', async (req, res) => {
    const { email } = req.body;

    try {
        // Send password reset email
        await admin.auth().sendPasswordResetEmail(email);
        res.send('Password reset email sent. Check your inbox.');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).send('Error sending password reset email');
    }
});


// Dashboard routes
app.get('/dashboard/:usertype', async (req, res) => {
    const usertype = req.params.usertype;
    const userId = req.query.userId;

    try {
        // Get user details from Firestore based on user ID
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Render respective dashboard based on user type
        if (usertype === 'type1') {
            res.render('type1dashboard', { userData });
        } else if (usertype === 'type2') {
            res.render('type2dashboard', { userData });
        } else {
            res.status(404).send('Dashboard not found');
        }
    } catch (error) {
        console.error('Error retrieving user data:', error);
        res.status(500).send('Error retrieving user data');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
