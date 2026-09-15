const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true
        },

        options: {
            type: [String],
            required: true
        },

        correctAnswer: {
            type: Number,
            required: true,
            min: 0,
            max: 3
        },

        category: {
            type: String,
            required: true
        },

        difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            default: "Medium"
        },

        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Question", questionSchema);