document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const senderId = urlParams.get("buyerId"); // Assuming current user is the buyer
  const receiverId = urlParams.get("sellerId");

  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const messagesDiv = document.getElementById("messages");

  async function fetchMessages() {
    const response = await fetch(`/fetch-messages/${senderId}/${receiverId}`);
    if (response.ok) {
      const messages = await response.json();
      displayMessages(messages);
    } else {
      console.error("Failed to fetch messages");
    }
  }

  async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === "") {
      return;
    }

    const response = await fetch("/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderId,
        receiverId,
        messageText,
      }),
    });

    if (response.ok) {
      messageInput.value = ""; // Clear the input after sending
      fetchMessages(); // Refresh the messages
    } else {
      console.error("Failed to send message");
    }
  }

  function displayMessages(messages) {
    messagesDiv.innerHTML = ""; // Clear existing messages
    messages.forEach((msg) => {
      const messageElement = document.createElement("div");
      messageElement.classList.add("message");
      // Customize this based on how your messages are structured
      messageElement.textContent = `${
        msg.senderId === senderId ? "You" : "Seller"
      }: ${msg.messageText}`;
      messagesDiv.appendChild(messageElement);
    });
  }

  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent the default action to avoid line breaks in the input field
      sendMessage();
    }
  });

  fetchMessages(); // Initial fetch of messages

  // Optional: Set up a simple polling mechanism to refresh chat messages every few seconds
  setInterval(fetchMessages, 5000);
});
