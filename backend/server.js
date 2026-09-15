const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();

const questionRoutes = require("./routes/questionRoutes");
const resultRoutes = require("./routes/resultRoutes");
const authRoutes =require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const app = express();
// Middleware
app.use(express.json());
// Serve frontend files
app.use(express.static(path.join(__dirname, "..")));
// API routes
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "quiz.html"));
});
// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log(
            "MongoDB connected successfully"
        );
        const PORT =process.env.PORT || 8080;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    });