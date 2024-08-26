document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');

    let messageHistory = [];

    async function sendMessage(message) {
        try {

            messageHistory.push({
                                   "role": "user",
                                   "content": message
            })
            
            const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "model": document.getElementById("model-select").value,
                    stream: true,
                    "messages": messageHistory
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            const messageElement = document.createElement('p');
            messageElement.classList.add('bot-message');
            chatMessages.appendChild(messageElement);

            chatMessages.scrollTop = chatMessages.scrollHeight;

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    messageHistory.push({
                                           "role": "assistant",
                                           "content": message
                    })
                    break;
                }
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                const parsedLines = lines
                    .map(line => line.replace(/^data: /, "").trim())
                    .filter(line => line !== "" && line !== "[DONE]")
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (error) {
                            createNotification('The AI response may end soon.', 3000, 'error')
                            console.warn(`Failed to parse JSON for line: ${line}`);
                            return null; 
                        }
                    })
                    .filter(line => line !== null);

                let chunkcount = 0;

                for (const parsedLine of parsedLines) {
                    const { choices } = parsedLine;
                    const { delta } = choices[0];
                    const { content } = delta;

                    if (content) {
                        const contentSpan = document.createElement('span');
                        contentSpan.textContent = content;
                        contentSpan.classList.add('fade-in'); 
                        messageElement.appendChild(contentSpan);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            displayChatMessage('An error occurred.', false);
        }
    }

    function displayChatMessage(text, isUserMessage) {
        const messageElement = document.createElement('p');
        messageElement.textContent = text;
        messageElement.classList.add(isUserMessage ? 'user-message' : 'bot-message');
        chatMessages.appendChild(messageElement);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendButton.addEventListener('click', () => {
        const messageText = userInput.value.trim();
        if (messageText !== '') {
            displayChatMessage(messageText, true); 
            sendMessage(messageText).then(() => {
            });
            userInput.value = ''; 
        }
    });

    userInput.addEventListener('keydown', function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            const messageText = userInput.value.trim();
            if (messageText !== '') {
                displayChatMessage(messageText, true); 
                sendMessage(messageText).then(() => {
                });
                userInput.value = ''; 
            }
        }
    });

});

function createNotification(message, duration = 5000, type = 'info') {
    const notificationContainer = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');

    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notificationContainer.removeChild(notification);

            if (notificationContainer.children.length === 0) {
                document.body.removeChild(notificationContainer);
            }
        }, 300);
    }, duration);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
}