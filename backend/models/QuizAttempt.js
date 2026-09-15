const mongoose = require("mongoose");
const quizAttemptSchema = new mongoose.Schema(

    {
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        startedAt: {
            type: Date,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);
quizAttemptSchema.index(
    {
        quizId: 1,
        userId: 1
    },
    {
        unique: true
    }
);
module.exports = mongoose.model("QuizAttempt",quizAttemptSchema);