// JavaScript code for Type 1 Dashboard (Ambulance)

let watchId;

document.getElementById('startRide').addEventListener('click', () => {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(sendLocation, handleLocationError);
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});

document.getElementById('stopRide').addEventListener('click', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
});

function sendLocation(position) {
    const { latitude, longitude } = position.coords;

    // Send latitude and longitude to server
    const data = {
        vehicleType: 'ambulance', // Identify as ambulance
        latitude,
        longitude
    };

    // Make an AJAX request to the server to update location
    fetch('/update-location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        console.log('Location sent successfully');
    })
    .catch(error => {
        console.error('Error sending location:', error.message);
    });
}

function handleLocationError(error) {
    // Handle geolocation errors
    console.error('Error getting location:', error.message);
}
