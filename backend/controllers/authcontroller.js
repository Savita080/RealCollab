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
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: "Login successful",
            token: accessToken,
            refreshToken,
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

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -refreshToken');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ user });
    } catch (error) {
        console.error("Error in getProfile:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, bio, avatar, githubUrl, skills } = req.body;

        const allowedUpdates = {};
        if (name !== undefined) allowedUpdates.name = name;
        if (bio !== undefined) allowedUpdates.bio = bio;
        if (avatar !== undefined) allowedUpdates.avatar = avatar;
        if (githubUrl !== undefined) allowedUpdates.githubUrl = githubUrl;
        if (skills !== undefined) allowedUpdates.skills = skills;

        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error in updateProfile:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ message: "Invalid refresh token" });

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({ token: accessToken });
    } catch (error) {
        res.status(403).json({ message: "Invalid or expired refresh token" });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const user = await User.findOne({ refreshToken });
        if (user) {
            user.refreshToken = null;
            await user.save();
        }
        res.status(200).json({ message: "Logged out" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body; // The token sent from React
        
        if (!credential) {
            return res.status(400).json({ message: "No Google credential provided" });
        }

        // 1. Fetch user profile from Google using the access token
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${credential}` }
        });

        if (!googleResponse.ok) {
            return res.status(401).json({ message: "Invalid Google access token" });
        }

        // 2. Extract the user's verified details
        const { email, name, picture } = await googleResponse.json();

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

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: "Google Login successful",
            token: accessToken,
            refreshToken,
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
