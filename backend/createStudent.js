require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createStudent() {

    try {

        await mongoose.connect(process.env.MONGO_URI);

        const name = "Pulkit Tuteja";
        const rollNumber = "230067";
        const username = "pulkit23";
        const password = "student123";
        const hashedPassword = await bcrypt.hash(password, 10);
        const existingStudent = await User.findOne({ username });

        if (existingStudent) {

            existingStudent.name = name;
            existingStudent.rollNumber = rollNumber;
            existingStudent.password = hashedPassword;
            existingStudent.role = "user";

            await existingStudent.save();

            console.log("Student updated successfully.");

        } else {

            await User.create({
                name,
                rollNumber,
                username,
                password: hashedPassword,
                role: "user"
            });

            console.log("Student created successfully.");
        }

        await mongoose.connection.close();

    } catch (error) {

        console.error(
            "Error creating/updating student:",
            error
        );

        process.exit(1);
    }
}

createStudent();