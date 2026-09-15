const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");
// CHANGE AUTHOR DETAILS HERE
const AUTHOR_NAME = "Quiz Author";
const AUTHOR_USERNAME = "Pulkit";
const AUTHOR_PASSWORD = process.env.ADMIN_PASSWORD;

async function createOrUpdateAdmin() {

    try {
        await mongoose.connect(
            process.env.MONGO_URI
        );
        console.log("MongoDB connected");

        const hashedPassword = await bcrypt.hash(AUTHOR_PASSWORD,10);
        const existingAdmin = await User.findOne({role: "admin"});

        if (existingAdmin) {
            existingAdmin.name =AUTHOR_NAME;
            existingAdmin.username = AUTHOR_USERNAME;
            existingAdmin.password = hashedPassword;
            existingAdmin.role = "admin";
            
            await existingAdmin.save();

            console.log("Author updated successfully!");
            console.log(`Username: ${AUTHOR_USERNAME}`);
        } else {
            await User.create({
                name:AUTHOR_NAME,
                username:AUTHOR_USERNAME,
                password:hashedPassword,
                role:"admin"
            });
            console.log("Author created successfully!");
            console.log(`Username: ${AUTHOR_USERNAME}`);
        }
    } catch (error) {
        console.error("Error creating/updating author:",error);
    } finally {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
    }
}
createOrUpdateAdmin();