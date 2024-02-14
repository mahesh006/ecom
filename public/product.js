function addProduct() {
  const productName = document.getElementById("productName").value;
  const productDescription =
    document.getElementById("productDescription").value;
  const productCategory = document.getElementById("productCategory").value;
  const itemType = document.getElementById("itemType").value;
  const productLocation = document.getElementById("productLocation").value;
  const productImage = document.getElementById("productImage").files[0];
  const userToken = localStorage.getItem("userToken");
  const userName = decodeJWT(userToken);

  let formData = new FormData();
  formData.append("userName", userName);
  formData.append("name", productName);
  formData.append("description", productDescription);
  formData.append("category", productCategory);
  formData.append("itemType", itemType);
  formData.append("location", productLocation);
  formData.append("image", productImage);

  fetch("/product", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => alert(JSON.stringify(data)))
    .catch((error) => console.error("Error:", error));
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById(
          "productLocation"
        ).value = `Lat: ${position.coords.latitude}, Lon: ${position.coords.longitude}`;
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
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
