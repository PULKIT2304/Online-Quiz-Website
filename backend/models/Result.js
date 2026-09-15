const mongoose = require("mongoose");
const resultSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        studentName: {
            type: String,
            required: true
        },

        rollNumber: {
            type: String,
            required: true
        },
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        correct: {
            type: Number,
            required: true,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 1
        },
        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        }
    },
    {
        timestamps: true
    }
);
resultSchema.index(
    { userId: 1, quizId: 1 },
    { unique: true }
);
module.exports = mongoose.model(
    "Result",
    resultSchema
);