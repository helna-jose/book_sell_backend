const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const bcrypt = require("bcryptjs"); // Import encryption package
const jwt = require("jsonwebtoken"); // Importing token library
const productmodel = require("./models/addpro");


app.use(cors());
app.use(express.json());




// Connect to MongoDB
mongoose.connect("mongodb+srv://helnajose:helnamongodb@cluster0.cup42.mongodb.net/bookdb?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Failed to connect to MongoDB", err));

const generateHashedpswd = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // Salt is a cost factor
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error("Error generating hashed password", error);
        throw error;
    }
}

//book.js

const { bookmodel } = require("./models/book");

app.post("/signup", async (req, res) => {
    try {
        let input = req.body;
        let hashedpswd = await generateHashedpswd(input.password);
        input.password = hashedpswd; // This is for getting hashed password in db

        let bookusers = new bookmodel(input);
        await bookusers.save();
        res.json({ "status": "SIGNUP" });
    } catch (error) {
        console.error("Error during signup", error);
        res.status(500).json({ "status": "error", "message": "Internal Server Error" });
    }
});

// Login API - here we need async as the password is encrypted
app.post("/login", async (req, res) => {
    try {
        let input = req.body;
        
        // Query using 'email'
        const response = await bookmodel.find({ email: input.email });

        if (response.length > 0) {
            let dbpass = response[0].password;
            const isMatch = await bcrypt.compare(input.password, dbpass);

            if (isMatch) {
                // If login success generate token
                jwt.sign(
                    { email: input.email }, 
                    process.env.JWT_SECRET || "book-frontend", 
                    { expiresIn: "1d" },
                    (error, token) => {
                        if (error) {
                            return res.status(500).json({ status: "error", message: "Unable to create token" });
                        } else {
                            return res.status(200).json({ status: "success", userid: response[0]._id, token: token });
                        }
                    }
                );
            } else {
                return res.status(401).json({ status: "error", message: "Incorrect password" });
            }
        } else {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
    } catch (error) {
        console.error("Error during login", error);
        return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});



app.post('/', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ status: "error", message: "Could not log out." });
        }
        res.json({ status: "success", message: "Logged out successfully." });
    });
});








app.post("/view", (req, res) => {
    const token = req.headers["token"];
    
    jwt.verify(token, process.env.JWT_SECRET || "book-frontend", (error, decoded) => {
        if (error) {
            res.json({ "status": "unauthorized access" });
        } else {
            if (decoded) {
                bookmodel.find().then(
                    (response) => {
                        res.json(response);
                    }
                ).catch(err => {
                    console.error("Error fetching data", err);
                    res.status(500).json({ "status": "error", "message": "Internal Server Error" });
                });
            }
        }
    });
});

app.get("/viewsign", (req, res) => {
    bookmodel.find().then((data) => {
        res.json(data);
    }).catch((error) => {
        console.error("Error fetching data", error);
        res.status(500).json({ "status": "error", "message": "Internal Server Error" });
    });
});

// Define Product Schema
// const productSchema = new mongoose.Schema({
//     image: String,
//     pname: String,
//     pdescription: String,
//     price: Number,
//     quantity: Number,
//     category: String,
// });


// Add product route
app.post("/addpro", (req, res) => {
    console.log("Received data:", req.body);
    
    const input = req.body;

    const product = new productmodel(input); // Use productmodel directly

    product.save()
        .then(() => {
            console.log("Product added:", product);
            res.json({ "status": "success" });
        })
        .catch((error) => {
            console.error("Error adding product:", error);
            res.status(500).json({ "status": "error", "message": error.message });
        });
});
// const productSchema = new mongoose.Schema({
//     image: String,
//     pname: String,
//     pdescription: String,
//     price: Number,
//     quantity: Number,
//     category: String,
// });
// View all products route
app.get("/viewpro", (req, res) => {
    productmodel.find()
        .then((data) => res.json(data))
        .catch((error) => res.json(error));
});
// app.post("/addpro", (req, res) => {
//     const { image, email, pname, pdescription, price, quantity, category } = req.body;

//     if (!image || !email || !pname || !pdescription || !price || !quantity || !category) {
//         return res.status(400).json({ status: "error", message: "Please fill in all fields." });
//     }

//     const product = new productmodel(req.body);
//     product.save()
//         .then(() => {
//             console.log("Product added:", product);
//             res.json({ "status": "success" });
//         })
//         .catch((error) => {
//             console.error("Error adding product:", error);
//             res.status(500).json({ "status": "error", "message": error.message });
//         });
// });


// Search products route
app.post("/searchpro", (req, res) => {
    const input = req.body;
    Product.find(input)
        .then((data) => res.json(data))
        .catch((error) => res.json(error));
});

// Delete product route
app.post("/delpro", (req, res) => {
    const input = req.body;
    Product.findByIdAndDelete(input._id)
        .then(() => res.json({ "status": "success" }))
        .catch((error) => res.json({ "status": "error", "message": error.message }));
});



app.get("/vieworders", (req, res) => {
    Order.find()
        .populate('productId') // Populate product details
        .then((orders) => {
            // Return the orders with product details
            const orderDetails = orders.map(order => ({
                orderId: order._id,
                productName: order.productId.pname, // Fetch product name
                productId: order.productId._id, // Fetch product ID
                userEmail: order.email,
                userPhone: order.phone,
                address: order.address,
                quantity: order.orderQuantity,
                price: order.productId.price // Fetch product price
            }));
            res.json(orderDetails);
        })
        .catch((error) => {
            console.error("Error fetching orders:", error);
            res.status(500).json({ message: "Error fetching orders", error });
        });
});


// Define Product Schema and Model
//  const productmodel = new mongoose.Schema({
//      image: String,
//      email: String,
//      pname: String,
//      pdescription: String,
//      price: Number,
//      quantity: Number
// });
// const Product = mongoose.model("Product", productSchema);

// Define Order Schema and Model
const orderSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    address: String,
    paymentMethod: String,
    email: String,
    phone: String,
    orderQuantity: Number,
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", orderSchema);

// Buy product route (handling "Buy Now")
app.post("/order", (req, res) => {
    const { productId, address, paymentMethod, email, phone, orderQuantity } = req.body;

    // Find the product by ID
    productmodel.findById(productId)
        .then((product) => {
            if (product && product.quantity >= orderQuantity) {
                // Reduce the product quantity by the ordered amount
                product.quantity -= orderQuantity;

                // Save the updated product quantity
                product.save()
                    .then(() => {
                        // Create a new order with all the details
                        const newOrder = new Order({
                            productId: product._id,
                            address,
                            paymentMethod,
                            email,
                            phone,
                            orderQuantity
                        });

                        // Save the order
                        newOrder.save()
                            .then(() => res.json({ status: "success", message: "Order placed successfully!" }))
                            .catch((error) => res.json({ status: "error", message: error.message }));
                    })
                    .catch((error) => res.json({ status: "error", message: error.message }));
            } else {
                res.json({ status: "error", message: "Product out of stock or insufficient quantity." });
            }
        })
        .catch((error) => res.json({ status: "error", message: error.message }));
});

// Fetch all products
// app.get("/viewpro", (req, res) => {
//     Product.find()
//         .then((products) => res.json(products))
//         .catch((error) => res.json(error));
// });

// app.get("/viewpro", (req, res) => {
//     Product.find()
//         .then((products) => res.json(products))
//         .catch((error) => {
//             console.error(error);
//             res.status(500).json({ message: "Error fetching products" });
//         });
// });

const {complaintmodel} =require("./models/complaint");

// POST route to add complaints
app.post("/addcomplaint", (req, res) => {
    const { complaint } = req.body; // Only extract complaint

    // Validate input
    if (!complaint) {
        return res.status(400).json({ status: "error", message: "Complaint is required" });
    }

    // Create a new complaint document
    const newComplaint = new complaintmodel({
        complaint: complaint,
        // Removed datec from the document
    });

    // Save the complaint to the database
    newComplaint.save()
        .then(() => {
            res.json({ status: "success", message: "Complaint registered successfully" });
        })
        .catch((error) => {
            console.error("Error saving complaint:", error);
            res.status(500).json({ status: "error", message: "Failed to register complaint" });
        });
});



app.get("/viewcom",(req,res)=>{
    complaintmodel.find().then((data)=>{
        res.json(data)
    }).catch((error)=>{
        res.json(error)
    })
})
app.get("/viewsign", (req, res) => {
    bookmodel.find().then((data) => {
        res.json(data);
    }).catch((error) => {
        console.error("Error fetching data", error);
        res.status(500).json({ "status": "error", "message": "Internal Server Error" });
    });
});

// View all orders route
app.get("/vieworders", (req, res) => {
    Order.find()
        .populate('productId') // Populate product details
        .then((orders) => {
            // Return the orders with product details
            const orderDetails = orders.map(order => ({
                orderId: order._id,
                productName: order.productId.pname, // Fetch product name
                productId: order.productId._id, // Fetch product ID
                userName: order.name, // Include user name
                userEmail: order.email,
                userPhone: order.phone,
                address: order.address,
                pincode: order.pincode, // Include pincode
                quantity: order.orderQuantity,
                price: order.productId.price // Fetch product price
            }));
            res.json(orderDetails);
        })
        .catch((error) => {
            console.error("Error fetching orders:", error);
            res.status(500).json({ message: "Error fetching orders", error });
        });
});

//delete user
app.post("/deleteuser", (req, res) => {
    let input = req.body;
    console.log("Received delete request for ID:", input._id); // Log the received ID
    bookmodel.findByIdAndDelete(input._id)
        .then((response) => {
            if (response) {
                res.json({ "status": "success" });
            } else {
                console.error("User not found with ID:", input._id); // Log if user not found
                res.json({ "status": "error", message: "User not found" });
            }
        })
        .catch((error) => {
            console.error("Error deleting user:", error); // Log the error
            res.json({ "status": "error", message: error.message }); // Return the error message
        });
});


app.listen(7000,()=>{
    console.log("server started")
})