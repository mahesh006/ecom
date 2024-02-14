const express = require("express");
const { DocumentStore } = require("ravendb");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Configure RavenDB connection
const store = new DocumentStore("http://live-test.ravendb.net", "the");
store.initialize();

app.post("/user", async (req, res) => {
  const session = store.openSession();
  await session.store(req.body, `Users/${req.body.userName}`);
  console.log(req.body.userName);
  await session.saveChanges();
  res.send({ message: "User saved successfully" });
});

app.get("/user/:userName", async (req, res) => {
  const session = store.openSession();
  const user = await session.load(`Users/${req.params.userName}`);
  if (user) {
    res.send(user);
  } else {
    res.status(404).send({ message: "User not found" });
  }
});

app.put("/user/:userName", async (req, res) => {
  const session = store.openSession();
  const user = await session.load(`Users/${req.params.userName}`);
  if (user) {
    Object.assign(user, req.body);
    await session.saveChanges();
    res.send({ message: "User updated successfully" });
  } else {
    res.status(404).send({ message: "User not found" });
  }
});

app.delete("/user/:userName", async (req, res) => {
  const session = store.openSession();
  const user = await session.load(`Users/${req.params.userName}`);
  if (user) {
    session.delete(user);
    await session.saveChanges();
    res.send({ message: "User deleted successfully" });
  } else {
    res.status(404).send({ message: "User not found" });
  }
});

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_secret_key"; // This should be in an environment variable

// Sign-up endpoint
app.post("/signup", async (req, res) => {
  const session = store.openSession();
  const { userName, name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

  // Define the user object
  const user = {
    userName,
    name,
    email,
    type: "user",
    password: hashedPassword,
  };

  try {
    // Store the user object in the session
    await session.store(user, `Users/${userName}`);

    // Explicitly set the collection in the document metadata
    session.advanced.getMetadataFor(user)["@collection"] = "Users";

    // Save changes to the session, persisting the user document
    await session.saveChanges();
    res.send({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send({ message: "Error registering user" });
  }
});

// Sign-in endpoint
app.post("/signin", async (req, res) => {
  const { userName, password } = req.body;
  const session = store.openSession();
  const user = await session.load(`Users/${userName}`);
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    const token = jwt.sign({ id: user.userName }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.send({ message: "Login successful", token });
  } else {
    res.status(401).send({ message: "Invalid credentials" });
  }
});

const multer = require("multer");
const path = require("path");

// Configure multer with a custom storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Destination folder
  },
  filename: function (req, file, cb) {
    // Generate file name: originalName + Date + file extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.post("/product", upload.single("image"), async (req, res) => {
  // Extract additional fields from req.body
  const { userName, name, description, category, itemType, location } =
    req.body;

  const session = store.openSession();

  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const imagePath = "/uploads/" + req.file.filename; // Use the filename generated by multer

  const product = {
    userId: userName,
    name,
    description,
    category, // Add category to product
    itemType, // Add item type to product
    imagePath,
    location,
    createdAt: new Date(),
  };

  await session.store(product);
  session.advanced.getMetadataFor(product)["@collection"] = "Products";
  await session.saveChanges();

  res.send({ message: "Product added successfully" });
});

app.get("/product/:productId", async (req, res) => {
  const { productId } = req.params;
  // Assuming 'store' is your configured document store for RavenDB
  const session = store.openSession();

  try {
    const product = await session.load(productId);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send({ message: "Error fetching product details" });
  }
});

app.get("/product/:productId/reviews", async (req, res) => {
  const { productId } = req.params;
  const session = store.openSession();

  try {
    // Assuming 'Reviews' is the collection where reviews are stored
    const reviews = await session
      .query({ collection: "Reviews" })
      .whereEquals("productId", productId)
      .orderByDescending("createdAt")
      .all();

    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ message: "Error fetching reviews" });
  }
});

app.post("/product/:productId/review", async (req, res) => {
  const { productId } = req.params;
  const { userName, rating, reviewText } = req.body;

  const session = store.openSession();

  try {
    const review = {
      productId,
      userId: userName, // Assuming userName is the ID of the user
      rating,
      reviewText,
      createdAt: new Date(),
    };

    // This will automatically create a new collection for reviews if it doesn't exist
    await session.store(review);
    session.advanced.getMetadataFor(review)["@collection"] = "Reviews";

    await session.saveChanges();

    res.send({ message: "Review added successfully" });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).send({ message: "Error submitting review" });
  }
});

app.post("/send-message", async (req, res) => {
  const { senderId, receiverId, messageText } = req.body;

  const session = store.openSession();

  try {
    const message = {
      senderId,
      receiverId,
      messageText,
      createdAt: new Date(),
    };
    // Log the received IDs to ensure they are not undefined
    console.log("Received senderId:", senderId, "receiverId:", receiverId);
    await session.store(message);
    session.advanced.getMetadataFor(message)["@collection"] = "Messages";

    await session.saveChanges();

    res.send({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send({ message: "Error sending message" });
  }
});

app.get("/fetch-messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;
  const session = store.openSession();

  try {
    const messages = await session
      .query({ collection: "Messages" })
      .whereEquals("senderId", senderId)
      .orElse()
      .whereEquals("senderId", receiverId)
      .andAlso()
      .whereEquals("receiverId", senderId)
      .orElse()
      .whereEquals("receiverId", receiverId)
      .orderBy("createdAt")
      .all();

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send({ message: "Error fetching messages" });
  }
});

// Get all products for a specific user
app.get("/products/:userName", async (req, res) => {
  const session = store.openSession();
  const userName = req.params.userName;

  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const products = await session
    .query({ collection: "Products" })
    .whereEquals("userId", userName)
    .all();

  res.send(products);
});

app.get("/products", async (req, res) => {
  const session = store.openSession();
  try {
    let query = await session
      .query({ id: "Products" })
      .whereNotEquals("type", "user");

    // Check for a search query parameter and adjust the query
    if (req.query.search) {
      query = query.whereEquals("name", req.query.search); // Adjust based on your search criteria
    }

    const products = await query.all();
    console.log(products);
    res.send(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).send("Error fetching products");
  }
});

// Get all products for a specific user under a new route
app.get("/profile/:userName", async (req, res) => {
  const session = store.openSession();
  const userName = req.params.userName;

  // Authentication check
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const products = await session
      .query({ id: "Products" })
      .whereEquals("userId", userName)
      .all();
    console.log("User-specific products:", products);
    res.send(products);
  } catch (error) {
    console.error("Failed to fetch user-specific products:", error);
    res.status(500).send("Error fetching user-specific products");
  }
});
const fs = require("fs").promises; // Node.js File System module with Promise support

app.delete("/delete-product/*", async (req, res) => {
  const productId = req.params[0]; // This captures everything after /delete-product/
  const session = store.openSession();

  try {
    const product = await session.load(productId);
    if (product) {
      // Delete the product from the database
      await session.delete(product);
      await session.saveChanges();

      // Now, delete the associated image file if imagePath exists
      if (product.imagePath && product.imagePath.length > 0) {
        const imagePath = path.join(__dirname, product.imagePath); // Adjust if necessary to match your server's file structure
        try {
          await fs.unlink(imagePath);
          console.log("Associated image deleted successfully");
        } catch (fsError) {
          console.error("Error deleting associated image:", fsError);
          // Consider how you want to handle errors where the product is deleted but the image file is not.
          // You might log these errors for manual cleanup or implement a retry mechanism.
        }
      }

      res.send({ message: "Product deleted successfully" });
    } else {
      res.status(404).send({ message: "Product not found" });
    }
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).send("Error deleting product");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});