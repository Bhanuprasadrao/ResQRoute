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
        vehicleType: 'public', // Identify as public user
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

// Event listener to receive alert messages via WebSocket
const socket = new WebSocket('wss://res-qr-oute2-0-ir6s2dqby-bhanu-prasad-raos-projects.vercel.app');

socket.onmessage = (event) => {
    const alertMessage = event.data;
    displayAlert(alertMessage);
};

function displayAlert(message) {
    const alertElement = document.createElement('div');
    alertElement.textContent = message;
    alertElement.style.position = 'fixed';
    alertElement.style.top = '10px';
    alertElement.style.right = '10px';
    alertElement.style.padding = '10px';
    alertElement.style.backgroundColor = 'red';
    alertElement.style.color = 'white';
    document.body.appendChild(alertElement);

    setTimeout(() => {
        alertElement.remove();
    }, 5000); // Remove alert after 5 seconds
}
