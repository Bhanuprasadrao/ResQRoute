const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const geolib = require('geolib');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://resqroute-e1a35.firebaseio.com',
});

const db = admin.firestore();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/signup.html', (req, res) => {
    res.sendFile(__dirname + '/views/signup.html');
});

app.get('/type1dashboard.html', (req, res) => {
    res.sendFile(__dirname + '/views/type1dashboard.html');
});

app.get('/type2dashboard.html', (req, res) => {
    res.sendFile(__dirname + '/views/type2dashboard.html');
});

app.get('/type1dashboard.js', (req, res) => {
    res.sendFile(__dirname + '/views/type1dashboard.js');
});

app.get('/type2dashboard.js', (req, res) => {
    res.sendFile(__dirname + '/views/type2dashboard.js');
});

app.get('/login.css', (req, res) => {
    res.sendFile(__dirname + '/views/styles/login.css');
});

app.get('/signup.css', (req, res) => {
    res.sendFile(__dirname + '/views/styles/signup.css');
});

app.get('/index.css', (req, res) => {
    res.sendFile(__dirname + '/views/index.css');
});

app.post('/signup', async (req, res) => {
    const { fullname, userid, email, usertype, licenseno, password, confirmpassword } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email address format');
    }

    if (password !== confirmpassword) {
        return res.status(400).send('Passwords do not match');
    }

    try {
        await db.collection('users').doc(email).set({
            fullname,
            userid,
            email,
            usertype,
            licenseno,
            password
        });
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

app.post('/login', async (req, res) => {
    const { email, password, usertype } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email address format');
    }

    try {
        const userDoc = await db.collection('users').doc(email).get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(401).send('User not found');
        }

        if (userData.password !== password) {
            return res.status(401).send('Invalid password');
        }

        if (userData.usertype !== usertype) {
            return res.status(401).send('Invalid user type');
        }

        if (usertype === 'type1') {
            res.redirect('/type1dashboard.html');
        } else if (usertype === 'type2') {
            res.redirect('/type2dashboard.html');
        } else {
            res.status(404).send('Dashboard not found');
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).send('Error authenticating user');
    }
});

app.post('/resetpassword', async (req, res) => {
    const { email } = req.body;

    try {
        await admin.auth().sendPasswordResetEmail(email);
        res.send('Password reset email sent. Check your inbox.');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).send('Error sending password reset email');
    }
});

app.get('/dashboard/:usertype', async (req, res) => {
    const usertype = req.params.usertype;
    const userId = req.query.userId;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

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

app.post('/update-location', async (req, res) => {
    const { vehicleType, latitude, longitude } = req.body;
    
    try {
        await db.collection('vehicles').doc(vehicleType).set({
            latitude,
            longitude
        }, { merge: true });
        res.status(200).send('Location updated successfully');
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).send('Error updating location');
    }
});

let clients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log('Received:', message);
        ws.send('Hello, client!');
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});


setInterval(async () => {
    try {
        const ambulancesSnapshot = await db.collection('vehicles').doc('ambulance').get();
        const publicVehicleSnapshot = await db.collection('vehicles').doc('public').get();

        if (!ambulancesSnapshot.exists || !publicVehicleSnapshot.exists) {
            console.error('Error: Vehicles data not found');
            return;
        }

        const ambulance = ambulancesSnapshot.data();
        const publicVehicle = publicVehicleSnapshot.data();

        if (ambulance && ambulance.latitude && ambulance.longitude && publicVehicle && publicVehicle.latitude && publicVehicle.longitude) {
            const distance = geolib.getDistance(
                { latitude: publicVehicle.latitude, longitude: publicVehicle.longitude },
                { latitude: ambulance.latitude, longitude: ambulance.longitude }
            );
            
            if (distance <= 500) {
                const alertMessage = 'Ambulance is approaching! Please clear the way.';
                console.log(alertMessage);
                clients.forEach(client => client.send(alertMessage));
            }
        }
    } catch (error) {
        console.error('Error calculating distance and triggering alerts:', error);
    }
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
