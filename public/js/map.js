let map;
let markers = [];
let currentSensor = null;
let searchBox;
let infoWindow;
let userName = '';
let userEmail = '';

// Handle welcome overlay
document.getElementById('start-exploring').addEventListener('click', () => {
    userName = document.getElementById('user-name').value;
    userEmail = document.getElementById('user-email').value;
    
    const overlay = document.getElementById('welcome-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
});

// Add color mapping for different sensor types
const sensorTypeColors = {
    'Camera': '#FF0000',           // Red
    'Air Quality Sensor': '#00FF00', // Green
    'People Counter': '#0000FF',    // Blue
    'Security Camera': '#FF4500',   // Orange Red
    'Traffic Sensor': '#800080',    // Purple
    'Weather Station': '#FFD700',   // Gold
    'Water Quality Sensor': '#00FFFF', // Cyan
    'Bicycle Counter': '#32CD32',   // Lime Green
    'Noise Sensor': '#FF69B4',     // Hot Pink
    'Environmental Sensor': '#98FB98', // Pale Green
    'Wi-Fi Analytics': '#DDA0DD',   // Plum
    'Parking Sensor': '#4682B4',    // Steel Blue
    'Flood Sensor': '#4169E1',     // Royal Blue
    'Smart Waste Bin': '#8B4513',  // Saddle Brown
    'Wildlife Camera': '#556B2F',   // Dark Olive Green
    'Soil Moisture Sensor': '#8B4513', // Saddle Brown
    'Smart Streetlight': '#FFD700', // Gold
    'Ice Sensor': '#87CEEB',       // Sky Blue
    'Pedestrian Sensor': '#FF8C00', // Dark Orange
    'Usage Sensor': '#9370DB',     // Medium Purple
    'Water Level Sensor': '#20B2AA', // Light Sea Green
    'Traffic Counter': '#800080',   // Purple
    'Bicycle/Pedestrian Counter': '#32CD32', // Lime Green
    'Occupancy Sensor': '#BA55D3',  // Medium Orchid
    'Speed Radar': '#DC143C'       // Crimson
};

// Default color for any sensor type not in the mapping
const defaultSensorColor = '#808080'; // Gray

function createLegend() {
    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 30px;
        right: 30px;
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 8px;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 1;
    `;

    const title = document.createElement('div');
    title.textContent = 'Sensor Types';
    title.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #ccc;
    `;
    legend.appendChild(title);

    // Sort sensor types alphabetically
    const sortedTypes = Object.entries(sensorTypeColors).sort((a, b) => a[0].localeCompare(b[0]));

    sortedTypes.forEach(([type, color]) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 4px 0;';

        const colorBox = document.createElement('div');
        colorBox.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${color};
            margin-right: 6px;
        `;

        const text = document.createElement('span');
        text.textContent = type;

        item.appendChild(colorBox);
        item.appendChild(text);
        legend.appendChild(item);
    });

    return legend;
}

async function initMap() {
    try {
        // Initialize map centered on Calgary
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 51.0447, lng: -114.0719 }, // Calgary coordinates
            zoom: 12,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        // Add the legend to the map
        const legend = createLegend();
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);

        // Initialize the search box
        const input = document.getElementById('location-search');
        const options = {
            bounds: new google.maps.LatLngBounds(
                { lat: 50.8, lng: -114.5 }, // SW bounds of Calgary
                { lat: 51.2, lng: -113.9 }  // NE bounds of Calgary
            ),
            componentRestrictions: { country: 'ca' },
            fields: ['geometry', 'name', 'formatted_address'],
            strictBounds: true
        };
        
        searchBox = new google.maps.places.Autocomplete(input, options);

        // Add search box listener
        searchBox.addListener('place_changed', () => {
            const place = searchBox.getPlace();
            if (!place.geometry || !place.geometry.location) {
                alert('No location found for the entered address.');
                return;
            }

            // Center map on selected location
            map.setCenter(place.geometry.location);
            map.setZoom(15);

            // Show nearby sensors
            showNearbySensors(place.geometry.location);
        });

        // Add click listener for search button
        document.getElementById('search-button').addEventListener('click', () => {
            const input = document.getElementById('location-search');
            if (input.value.trim() === '') {
                alert('Please enter a location to search.');
                return;
            }
            // Trigger place_changed event if there's a selected place
            const place = searchBox.getPlace();
            if (place && place.geometry) {
                map.setCenter(place.geometry.location);
                map.setZoom(15);
                showNearbySensors(place.geometry.location);
            }
        });

        // Initialize info window
        infoWindow = new google.maps.InfoWindow();

        // Load initial sensors
        await loadSensors();

        // Set up modal close button
        const modal = document.getElementById('sensor-modal');
        const closeBtn = document.querySelector('.close');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            currentSensor = null;
        };

        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                currentSensor = null;
            }
        };

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

async function loadSensors() {
    try {
        const response = await fetch('/data/sensors.json');
        const sensors = await response.json();
        
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        // Add markers for each sensor
        sensors.forEach(sensor => {
            const markerColor = sensorTypeColors[sensor.type] || defaultSensorColor;
            
            const marker = new google.maps.Marker({
                position: { lat: sensor.location.lat, lng: sensor.location.lng },
                map: map,
                title: sensor.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: markerColor,
                    fillOpacity: 0.8,
                    strokeColor: markerColor,
                    strokeWeight: 2,
                    scale: 8
                }
            });

            // Add click listener to marker
            marker.addListener('click', () => showSensorDetails(sensor));
            markers.push(marker);
        });
    } catch (error) {
        console.error('Error loading sensors:', error);
    }
}

function showNearbySensors(location) {
    markers.forEach(marker => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            location,
            marker.getPosition()
        );
        
        // Show markers within 2km
        marker.setVisible(distance <= 2000);
    });
}

function showSensorDetails(sensor) {
    currentSensor = sensor;
    
    // Create sensor details HTML
    const detailsHtml = `
        <div class="sensor-info">
            <h2>${sensor.name}</h2>
            <p><strong>Type:</strong> ${sensor.type}</p>
            <p><strong>Status:</strong> ${sensor.status}</p>
            <p><strong>Location:</strong> ${sensor.location.address}</p>
            <p><strong>Description:</strong> ${sensor.description}</p>
            <p><strong>Data Collected:</strong></p>
            <ul>
                ${sensor.data_collected.map(data => `<li>${data}</li>`).join('')}
            </ul>
            <p><strong>Privacy Policy:</strong> ${sensor.privacy_policy}</p>
            <p><strong>Installation Date:</strong> ${sensor.install_date}</p>
            <p><strong>Last Maintenance:</strong> ${sensor.last_maintenance}</p>
            <button id="chat-button" class="chat-button">Chat about sensor</button>
        </div>
        <div class="chat-container" style="display: none;">
            <div class="chat-messages"></div>
            <div class="chat-input">
                <input type="text" placeholder="Ask a question about this sensor...">
                <button>Send</button>
            </div>
        </div>
    `;

    // Update modal content and display it
    document.getElementById('sensor-details').innerHTML = detailsHtml;
    document.getElementById('sensor-modal').style.display = 'block';

    // Add chat button click handler
    document.getElementById('chat-button').addEventListener('click', () => {
        const chatContainer = document.querySelector('.chat-container');
        const chatButton = document.getElementById('chat-button');
        
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'block';
            chatButton.textContent = 'Hide chat';
        } else {
            chatContainer.style.display = 'none';
            chatButton.textContent = 'Chat about sensor';
        }
    });

    // Set up chat input handlers
    const chatInput = document.querySelector('.chat-input input');
    const chatButton = document.querySelector('.chat-input button');
    
    chatButton.addEventListener('click', () => sendMessage(chatInput.value));
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatInput.value);
        }
    });
}

async function sendMessage(message) {
    if (!message.trim() || !currentSensor) return;

    const chatMessages = document.querySelector('.chat-messages');
    const input = document.querySelector('.chat-input input');
    
    // Add user message
    chatMessages.innerHTML += `
        <div class="message user-message">
            ${message}
        </div>
    `;

    // Clear input
    input.value = '';
    
    try {
        // Send message to server
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                sensor: currentSensor,
                chatId: `sensor-${currentSensor.id}`
            })
        });

        const data = await response.json();
        
        // Add AI response
        chatMessages.innerHTML += `
            <div class="message ai-message">
                ${data.response}
            </div>
        `;

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error sending message:', error);
        chatMessages.innerHTML += `
            <div class="message error-message">
                Sorry, there was an error processing your message. Please try again.
            </div>
        `;
    }
}

// Initialize map when the page loads
window.addEventListener('load', initMap); 