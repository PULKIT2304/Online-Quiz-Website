const express = require("express");

const router = express.Router();

const Result = require("../models/Result");
const Question = require("../models/Question");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");

const {
    authenticateToken,
    requireAdmin
} = require("../middleware/authMiddleware");


// =====================================================
// GET RESULTS
// LOGIN REQUIRED
// =====================================================

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            let results;


            // =================================================
            // AUTHOR
            // AUTHOR SEES ONLY RESULTS OF THEIR OWN QUIZZES
            // =================================================

            if (
                req.user.role === "admin"
            ) {

                results =
                    await Result.find({

                        authorId:
                            req.user.userId

                    })
                        .sort({
                            createdAt: -1
                        });


            } else {


                // =================================================
                // STUDENT
                // STUDENT SEES ONLY THEIR OWN RESULTS
                // =================================================

                results =
                    await Result.find({

                        userId:
                            req.user.userId

                    })
                        .sort({
                            createdAt: -1
                        });

            }


            return res.json(
                results
            );


        } catch (error) {

            console.error(
                "Error fetching results:",
                error
            );


            return res.status(500).json({
                message:
                    "Failed to fetch results"
            });

        }

    }
);


// =====================================================
// SUBMIT QUIZ
// LOGIN REQUIRED
// =====================================================

router.post(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.userId
                );


            if (!user) {

                return res.status(401).json({
                    message:
                        "User not found"
                });

            }


            // Only students can submit quizzes
            if (
                user.role !== "user"
            ) {

                return res.status(403).json({
                    message:
                        "Only students can submit quizzes"
                });

            }


            const {
                quizId,
                answers
            } = req.body;


            if (!quizId) {

                return res.status(400).json({
                    message:
                        "Quiz ID is required"
                });

            }


            const quiz =
                await Quiz.findById(
                    quizId
                );


            if (!quiz) {

                return res.status(404).json({
                    message:
                        "Quiz not found"
                });

            }


            // =================================================
            // FIND STUDENT'S ATTEMPT
            // =================================================

            const attempt =
                await QuizAttempt.findOne({

                    quizId:
                        quiz._id,

                    userId:
                        user._id

                });


            if (!attempt) {

                return res.status(403).json({
                    message:
                        "Quiz attempt was not started"
                });

            }


            // =================================================
            // SERVER-SIDE TIMER CHECK
            // =================================================

            const now =
                Date.now();


            if (
                now >
                attempt.expiresAt.getTime()
            ) {

                return res.status(408).json({
                    message:
                        "Time is over. Your quiz cannot be submitted."
                });

            }


            if (
                !Array.isArray(
                    answers
                )
            ) {

                return res.status(400).json({
                    message:
                        "Answers must be an array"
                });

            }


            // =================================================
            // PREVENT DUPLICATE SUBMISSION
            // =================================================

            const existingResult =
                await Result.findOne({

                    quizId,

                    userId:
                        user._id

                });


            if (existingResult) {

                return res.status(409).json({
                    message:
                        "This quiz has already been submitted"
                });

            }


            // =================================================
            // CHECK QUESTION IDS
            // =================================================

            const submittedIds =
                answers.map(
                    answer =>
                        String(
                            answer.questionId
                        )
                );


            const validQuestionIds =
                quiz.questionIds.map(
                    id =>
                        String(id)
                );


            const invalidQuestion =
                submittedIds.some(
                    id =>
                        !validQuestionIds.includes(
                            id
                        )
                );


            if (invalidQuestion) {

                return res.status(400).json({
                    message:
                        "Invalid question submitted"
                });

            }


            // =================================================
            // PREVENT DUPLICATE QUESTION ANSWERS
            // =================================================

            const uniqueSubmittedIds =
                new Set(
                    submittedIds
                );


            if (
                uniqueSubmittedIds.size !==
                submittedIds.length
            ) {

                return res.status(400).json({
                    message:
                        "Duplicate question answers are not allowed"
                });

            }


            // =================================================
            // GET QUESTIONS
            // =================================================

            const questions =
                await Question.find({

                    _id: {
                        $in:
                            quiz.questionIds
                    }

                });


            let correctCount = 0;


            // =================================================
            // CHECK ANSWERS
            // =================================================

            for (
                const answer of answers
            ) {

                const question =
                    questions.find(
                        q =>
                            String(q._id) ===
                            String(
                                answer.questionId
                            )
                    );


                if (!question) {
                    continue;
                }


                if (

                    answer.answer !== null &&

                    answer.answer !== undefined &&

                    Number(
                        answer.answer
                    ) ===
                    question.correctAnswer

                ) {

                    correctCount++;

                }

            }


            const total =
                quiz.questionIds.length;


            const percentage =
                total
                    ? Math.round(
                        (
                            correctCount /
                            total
                        ) * 100
                    )
                    : 0;


            // =================================================
            // SAVE RESULT
            // =================================================

            const newResult =
                await Result.create({

                    userId:
                        user._id,

                    studentName:
                        user.name,

                    rollNumber:
                        user.rollNumber,

                    quizId:
                        quiz._id,

                    authorId:
                        quiz.authorId,

                    correct:
                        correctCount,

                    total,

                    percentage

                });


            return res.status(201).json({

                message:
                    "Quiz submitted successfully",

                result:
                    newResult

            });


        } catch (error) {

            console.error(
                "Error submitting quiz:",
                error
            );


            if (
                error.code === 11000
            ) {

                return res.status(409).json({
                    message:
                        "This quiz has already been submitted"
                });

            }


            return res.status(500).json({
                message:
                    "Failed to submit quiz"
            });

        }

    }
);


// =====================================================
// DELETE ALL RESULTS
// AUTHOR ONLY
// =====================================================

router.delete(
    "/",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            await Result.deleteMany({});


            return res.json({
                message:
                    "All results deleted successfully"
            });


        } catch (error) {

            console.error(
                "Error deleting results:",
                error
            );


            return res.status(500).json({
                message:
                    "Failed to delete results"
            });

        }

    }
);


module.exports = router;