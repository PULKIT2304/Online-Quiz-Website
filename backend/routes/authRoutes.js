const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// SIGN UP
router.post("/signup", async (req, res) => {
    try {
        const {
            name,
            rollNumber,
            username,
            password,
            role
        } = req.body;
        console.log("SIGNUP REQUEST:", {
            name,
            rollNumber,
            username,
            role
        });
        // Basic validation
        if (!name || !username || !password || !role) {
            return res.status(400).json({
                message:"Name, username, password and role are required"
            });
        }
        // Validate role
        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message:"Invalid signup role"
            });
        }
        // Roll number required only for students
        if (
            role === "user" &&
            (!rollNumber || !rollNumber.trim())
        ) {
            return res.status(400).json({
                message:"Roll number is required for students"
            });
        }
        // Check username
        const existingUsername =await User.findOne({username: username.trim()});

        if (existingUsername) {
            return res.status(409).json({
                message:"Username already exists"
            });
        }
        // Check roll number only for students
        if (role === "user") {
            const existingRollNumber = await User.findOne({rollNumber: rollNumber.trim()});

            if (existingRollNumber) {
                return res.status(409).json({
                    message:"Roll number already exists"
                });
            }
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password,10);
        // Prepare user data
        const userData = {
            name: name.trim(),
            username: username.trim(),
            password: hashedPassword,
            role: role
        };
        // Add roll number only for student
        if (role === "user") {
            userData.rollNumber =rollNumber.trim();
        }
        console.log("CREATING USER:",
            {
                name: userData.name,
                username: userData.username,
                role: userData.role,
                rollNumber: userData.rollNumber
            }
        );

        const user = await User.create(userData);

        console.log("USER CREATED:", user._id);
        return res.status(201).json({
            message:"Account created successfully",
            user: {
                id: user._id,
                name: user.name,
                rollNumber:user.rollNumber,
                username:user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error("========== SIGNUP ERROR ==========");
        console.error(error);
        console.error( "===================================");
        // Duplicate key error
        if (error.code === 11000) {

            const duplicateField =Object.keys(error.keyPattern || {})[0];

            return res.status(409).json({
                message:`${duplicateField || "Username"} already exists`
            });
        }
        // Mongoose validation error
        if (
            error.name ===
            "ValidationError"
        ) {
            const messages =Object.values(error.errors).map(err => err.message);

            return res.status(400).json({
                message:messages.join(", ")
            });
        }
        return res.status(500).json({
            message:"Server error during signup"
        });
    }
});
// LOGIN
router.post("/login", async (req, res) => {
    try {

        const {username,password,role} = req.body;

        if (
            !username ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                message:"Username, password and role are required"
            });
        }
        if (
            !["user", "admin"]
                .includes(role)
        ) {
            return res.status(400).json({
                message:"Invalid login role"
            });
        }
        const user = await User.findOne({username: username.trim()});
    
        if (!user) {
            return res.status(401).json({
                message:"Invalid username or password"
            });
        }
        if (user.role !== role) {
            return res.status(401).json({
                message:"This account is not registered with the selected role"
            });
        }

        const passwordMatch =await bcrypt.compare(password,user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                message:"Invalid username or password"
            });
        }

        const token = jwt.sign(
                {
                    userId:user._id,
                    role:user.role
                },
                JWT_SECRET,
                {
                    expiresIn:"2h"
                }
            );
        return res.json({
            message:"Login successful",
            token,
            user: {
                id:user._id,
                name:user.name,
                rollNumber:user.rollNumber,
                username:user.username,
                role:user.role
            }
        });
    } catch (error) {
        console.error("Login error:",error);
        return res.status(500).json({
            message:"Server error during login"
        });
    }
});
module.exports = router;