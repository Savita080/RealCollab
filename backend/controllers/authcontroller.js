import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "User already exists"});
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ 
            name, 
            email, 
            password: hashedPassword });
        res.status(201).json({message: "User created successfully",
            user:{
                name:newUser.name,
                email:newUser.email,
                id:newUser._id
            }});
    } catch (error) {
        console.error("Error in register controller: ",error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;


        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User Does Not Exists" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

       
        const accessToken = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' } // Token expires in 15 minutes for security
        );

        res.status(200).json({
            message: "Login successful",
            token: accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error in login controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body; // The token sent from React
        
        if (!credential) {
            return res.status(400).json({ message: "No Google credential provided" });
        }

        // 1. Verify the token with Google's servers
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        // 2. Extract the user's verified details
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // 3. Check if user already exists in our DB
        let user = await User.findOne({ email });

        // 4. If they are a new user, automatically register them!
        if (!user) {
            user = await User.create({
                name: name,
                email: email,
                avatar: picture || 'https://api.dicebear.com/7.x/bottts/svg',
                // Google users don't use passwords, so we generate a random secure one 
                // just to satisfy the database schema requirement
                password: await bcrypt.hash(Math.random().toString(36).slice(-10) + "Google!", 10)
            });
        }

        // 5. Generate our standard Access Token (just like normal login)
        const accessToken = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' } 
        );

        // 6. Send the exact same response format as normal login
        res.status(200).json({
            message: "Google Login successful",
            token: accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Error in Google Login:", error.message);
        res.status(401).json({ error: "Invalid Google Token or Authentication failed" });
    }
};
