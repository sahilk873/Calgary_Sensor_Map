# Calgary Sensor Map

An interactive web application that displays and provides information about various sensors across Calgary.

## Features
- Interactive map showing sensor locations
- Detailed information for each sensor
- Chat interface to ask questions about sensors
- Real-time data updates

## Setup
1. Clone this repository
2. Create a `.env` file based on `.env.example`
3. Install dependencies:
```bash
npm install
```
4. Start the server:
```bash
npm start
```
5. Open http://localhost:3000 in your browser

## Project Structure
```
calgary_map/
├── public/          # Static files
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── images/      # Image assets
├── data/           # Data files
│   └── sensors.json
├── server.js       # Express server
└── index.html      # Main entry point
```

## Environment Variables
- `PORT`: Server port (default: 3000)
- `OPENAI_API_KEY`: Your OpenAI API key for chat functionality

## Technologies Used
- HTML5
- JavaScript
- Express.js
- OpenAI API
- Google Maps API 