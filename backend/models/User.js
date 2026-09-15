const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        rollNumber: {
            type: String,
            required: function () {
                return this.role === "user";
            },
            unique: true,
            sparse: true,
            trim: true
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        }
    },
    {
        timestamps: true
    }
);
module.exports = mongoose.model("User", userSchema);