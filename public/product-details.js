document.addEventListener("DOMContentLoaded", function () {
  const userToken = localStorage.getItem("userToken");
  const userName = decodeJWT(userToken);

  // Call the function to fetch and display product details and reviews
  fetchProductDetails();
  setupReviewForm(userName);
});

const queryParams = new URLSearchParams(window.location.search);
const productId = queryParams.get("productId");

async function fetchProductDetails() {
  const detailsContainer = document.getElementById("productDetailsContainer");

  try {
    const response = await fetch(`/product/${productId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product details");
    }
    const product = await response.json();

    detailsContainer.innerHTML = `
            <h1>${product.name}</h1>
            <p>${product.description}</p>
            <p>Category: ${product.category}</p>
            <p>Item Type: ${product.itemType}</p>
            <button id="contactSeller">Contact Seller</button>
        `;

    document
      .getElementById("contactSeller")
      .addEventListener("click", function () {
        // Assuming decodeJWT returns an object with a user ID
        const currentUserId = decodeJWT(
          localStorage.getItem("userToken")
        ).userId;
        window.location.href = `chat.html?sellerId=${product.userId}&buyerId=${currentUserId}`;
      });

    fetchAndDisplayReviews();
  } catch (error) {
    console.error(error);
    alert("Error fetching product details");
  }
}

async function fetchAndDisplayReviews() {
  const reviewsContainer = document.getElementById("reviewsContainer");

  try {
    const reviewsResponse = await fetch(`/product/${productId}/reviews`);
    if (!reviewsResponse.ok) {
      throw new Error("Failed to fetch reviews");
    }
    const reviews = await reviewsResponse.json();

    let reviewsHtml =
      reviews.length > 0
        ? reviews
            .map(
              (review) => `
            <div class="review">
                <p>username: ${review.userId} </p>
                <p>Rating: ${review.rating} Stars</p>
                <p>Review: ${review.reviewText}</p>
            </div>
        `
            )
            .join("")
        : "<p>No reviews yet.</p>";

    reviewsContainer.innerHTML = `<h2>Reviews</h2>${reviewsHtml}`;
  } catch (error) {
    console.error(error);
    alert("Error fetching reviews");
  }
}

function setupReviewForm(userName) {
  const form = document.getElementById("reviewForm");
  form.onsubmit = async function (event) {
    event.preventDefault();

    const rating = document.getElementById("rating").value;
    const reviewText = document.getElementById("reviewText").value;

    try {
      const response = await fetch(`/product/${productId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: rating,
          reviewText: reviewText,
          userName: userName, // Replace with actual logic to get userName
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      // Clear form
      document.getElementById("rating").value = "";
      document.getElementById("reviewText").value = "";

      // Fetch and display updated reviews
      fetchAndDisplayReviews();

      alert("Review submitted successfully!");
    } catch (error) {
      console.error(error);
      alert("Error submitting review");
    }
  };
}

function decodeJWT(token) {
  const base64Url = token.split(".")[1]; // Get the payload part of the token
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload).id; // Assuming 'id' is where you stored the userName
}
