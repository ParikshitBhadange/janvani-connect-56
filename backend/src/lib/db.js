import mongoose from 'mongoose';

import { ENV } from './env.js';

export const connectDB = async () => {
    try {
       const conn = await mongoose.connect(ENV.DB_URL)
               console.log('MongoDB connected ✅:', conn.connection.host);
        }
        catch (error) {
            console.error('MongoDB connection failed ❌:', error.message);
            process.exit(1); // 0 means success, 1 means failure
        }
    };