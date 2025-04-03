import mongoose from 'mongoose';
import { BARGAIN_BEHAVIOUR } from '../constants.js';

const bargainingDetailsSchema = new mongoose.Schema(
  {
    productId: { 
        type: mongoose.Schema.Types.ObjectId,  // Use ObjectId if it's linked to Product
        ref: 'Product',
        required: true 
    },
    minPrice: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    category: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true  // Defaulting to true so it's always defined
    },
    bargainBehaviour: {
        type: String,
        enum: BARGAIN_BEHAVIOUR,  // Restrict to predefined values
        required: true,
        default: "normal"
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
  },
  { timestamps: true }
);

export const BargainingDetails = mongoose.model('BargainingDetails', bargainingDetailsSchema);
