import express from 'express';
import dotenv from 'dotenv';
import connectDB from './models/db.js';
const app = express();

dotenv.config();
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req, res) => {
    res.json({ message: "RealCollab Backend Is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});