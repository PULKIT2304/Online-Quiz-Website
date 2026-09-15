const mongoose = require("mongoose");
const quizSchema = new mongoose.Schema(
    
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        quizCode: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        questionIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
                required: true
            }
        ],
        durationMinutes: {
            type: Number,
            required: true,
            min: 5,
            max: 20
        }
    },
    {
        timestamps: true
    }
);
module.exports = mongoose.model("Quiz", quizSchema);