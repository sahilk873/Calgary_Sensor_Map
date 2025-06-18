// Function to fetch Calgary insights based on search query
async function fetchCalgaryInsights(query) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const container = document.getElementById('insights-container');
    
    try {
        loadingIndicator.style.display = 'block';
        container.innerHTML = '';
        
        const response = await fetch('/api/calgary-insights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const insights = await response.json();
        displayInsights(insights);
    } catch (error) {
        console.error('Error:', error);
        displayError('Failed to fetch Calgary insights. Please try again later.');
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Function to display insights in the UI
function displayInsights(insights) {
    const container = document.getElementById('insights-container');
    container.innerHTML = ''; // Clear existing content

    if (!insights || insights.length === 0) {
        container.innerHTML = '<p class="no-insights">No insights found for your search. Try a different query.</p>';
        return;
    }

    const insightsList = document.createElement('div');
    insightsList.className = 'insights-list';

    insights.forEach(insight => {
        const insightCard = document.createElement('div');
        insightCard.className = 'insight-card';
        
        const title = document.createElement('h3');
        title.textContent = insight.title;
        
        const content = document.createElement('p');
        content.textContent = insight.content;
        
        const source = document.createElement('a');
        source.href = insight.source_url;
        source.textContent = 'Read more';
        source.target = '_blank';
        
        const timestamp = document.createElement('small');
        timestamp.textContent = new Date(insight.timestamp).toLocaleString();
        
        insightCard.appendChild(title);
        insightCard.appendChild(content);
        insightCard.appendChild(source);
        insightCard.appendChild(timestamp);
        
        insightsList.appendChild(insightCard);
    });

    container.appendChild(insightsList);
}

// Function to display error messages
function displayError(message) {
    const container = document.getElementById('insights-container');
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

// Add search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Function to handle search
    const handleSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            fetchCalgaryInsights(query);
        }
    };
    
    // Search on button click
    searchButton.addEventListener('click', handleSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}); 