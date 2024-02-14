document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("nearbyItemsBtn")
    .addEventListener("click", fetchAndSortProductsByDistance);
  fetchAllProducts();
});

function fetchAllProducts() {
  fetch("/products", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((products) => displayProducts(products))
    .catch((error) => console.error("Error:", error));
}

function fetchAndSortProductsByDistance() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log("User's location:", latitude, longitude); // Debugging

      fetch("/products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((products) => {
          console.log(
            "Before sorting:",
            products.map((p) => p.name + " -> " + (p.distance || "No distance"))
          ); // Debugging
          const sortedProducts = sortProductsByDistance(
            products,
            latitude,
            longitude
          );
          console.log(
            "After sorting:",
            sortedProducts.map(
              (p) => p.name + " -> " + p.distance.toFixed(2) + " km"
            )
          ); // Debugging
          displayProducts(sortedProducts);
        })
        .catch((error) => console.error("Error fetching products:", error));
    },
    (error) => {
      console.error("Geolocation error:", error);
      alert("Unable to retrieve your location.");
    }
  );
}

function sortProductsByDistance(products, userLat, userLon) {
  return products
    .map((product) => {
      if (product.location) {
        // Assuming product.location is a string like "Lat: 16.5019648, Lon: 80.642048"
        // More robust parsing to handle spaces and labels
        const latLon = product.location.match(/Lat: ([\d.-]+), Lon: ([\d.-]+)/);
        if (latLon && latLon.length === 3) {
          const lat = parseFloat(latLon[1]);
          const lon = parseFloat(latLon[2]);
          product.distance = calculateDistance(userLat, userLon, lat, lon);
        } else {
          console.error("Invalid location format:", product.location);
          product.distance = Infinity; // Handle parsing failure
        }
      } else {
        product.distance = Infinity; // Products without a location go to the end
      }
      return product;
    })
    .sort((a, b) => a.distance - b.distance);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function displayProducts(sortedProducts) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  sortedProducts.forEach((product, index) => {
    const productElement = document.createElement("div");
    productElement.className = "product clickable";
    const imageHtml = product.imagePath
      ? `<img src="${product.imagePath}" alt="${product.name}" style="max-width: 100px; max-height: 100px;">`
      : "No image available";

    // Wrapping the product name in a clickable element
    const productInfoHTML = `
      ${imageHtml}
      <h2><a href="product-details.html?productId=${product.id}">${product.name}</a></h2>
      <p>${product.description}</p>
      <p>Category: ${product.category}</p>
      <p>Item Type: ${product.itemType}</p>
    `;

    productElement.innerHTML = productInfoHTML;

    container.appendChild(productElement);

    if (product.location) {
      const mapId = `map-${index}`;
      productElement.innerHTML += `<div id="${mapId}" style="height: 200px;"></div>`;
      initializeMap(mapId, product.location);
    }
  });
}

// Re-add your initializeMap function here unchanged

function initializeMap(mapId, locationString) {
  // Assuming locationString is in the format "Lat: 16.5019648, Lon: 80.642048"
  // First, remove the labels and split by comma
  const coords = locationString
    .replace("Lat: ", "")
    .replace("Lon: ", "")
    .split(", ");
  const lat = parseFloat(coords[0]);
  const lon = parseFloat(coords[1]);

  // Ensure lat and lon are valid numbers before initializing the map
  if (!isNaN(lat) && !isNaN(lon)) {
    const map = L.map(mapId).setView([lat, lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Add a marker for the product location
    L.marker([lat, lon]).addTo(map).bindPopup("Product Location");
  } else {
    console.error("Invalid location coordinates:", locationString);
  }
}

// Implementing searchProducts function
function searchProducts() {
  const searchValue = document.getElementById("searchInput").value;
  fetch(`/products?search=${encodeURIComponent(searchValue)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // Authorization header if required
    },
  })
    .then((response) => response.json())
    .then((products) => displayProducts(products))
    .catch((error) => console.error("Error:", error));
}
