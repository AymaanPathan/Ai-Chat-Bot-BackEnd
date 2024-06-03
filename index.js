const express = require("express");
const dotEnv = require("dotenv");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();
const Auth = require("./src/Auth.js");
const chatRoute = require("./src/Routes/chat.js");
const passwordAuth = require("./src/Controller/passwordAuth.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const userController = require("./src/Controller/Users.js");
// .Env Config

app.get("/", (req, res) => {
  res.send("hello");
});

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"],
  })
);

dotEnv.config({
  path: "./.env",
});

// Image upload
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `File-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Endpoint to handle image upload
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a file!" });
  }

  const filePath = path.join(uploadDir, req.file.filename);

  // Process the image with Google Generative AI
  const genAI = new GoogleGenerativeAI(
    "AIzaSyBqvG7BgojRbw0ZzUNyIICyUMu42t5-vI4"
  );

  const run = async () => {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const image = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    try {
      const result = await model.generateContent([image]);
      res.status(200).json(result.response.text());
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Error processing image" });
    }
  };
  run();
});

// MiddleWares
app.use(express.json());
// app.use(morgan("dev"));

// User Route
const MainRoute = express.Router();
MainRoute.route("/register").post(userController.register);
MainRoute.route("/login").post(userController.login);
MainRoute.route("/users").get(userController.getAllUsers);
MainRoute.route("/chats").post(Auth, chatRoute);
MainRoute.route("/forgetPassword").post(passwordAuth.forgetPassword);
MainRoute.route("/resetPassword/:token").post(passwordAuth.resetPassword);
// App Routes
app.use(MainRoute);

// app.use(cookieParser(process.env.COOKIE_SECRET));
// Connection to DATABASE
const connectDb = async () => {
  try {
    const db = process.env.MONGODB_URL;
    await mongoose.connect(db).then(() => console.log("DATABASE Connected🟢"));
  } catch (error) {
    console.log("Error While Connecting to DataBase🔴", error);
  }
};
connectDb();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server Started🟢"));
