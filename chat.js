// OpenAI Chat Integration

// Generate a unique chat ID
function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Store the current chat ID
let currentChatId = null;

async function generateChatResponse(message, sensor) {
    try {
        // Generate a new chat ID if we don't have one
        if (!currentChatId) {
            currentChatId = generateChatId();
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sensor,
                chatId: currentChatId
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get chat response');
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error in chat:', error);
        return 'I apologize, but I encountered an error while processing your message. Please try again.';
    }
}

// Reset chat context when closing chat
function resetChat() {
    currentChatId = null;
} 