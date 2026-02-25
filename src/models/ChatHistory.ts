/**
 * @module models/ChatHistory
 * @description MongoDB model for persisting AI chat conversation history.
 *
 * Each document represents a single chat session. Messages are stored
 * as an embedded array (capped at `MAX_MESSAGES` to bound document size).
 *
 * Session types distinguish between banking (authenticated) chats
 * and onboarding (unauthenticated) chats.
 */

import mongoose, { Schema, Document } from 'mongoose';

/** A single turn in the conversation. */
export interface IChatMessage {
    /** 'user' or 'model' */
    role: 'user' | 'model';
    /** Text content of the message. */
    text: string;
    /** Action type extracted from the AI response (e.g. 'balance', 'transfer_success'). */
    actionType?: string;
    /** The agent label classified for this turn. */
    agent?: string;
    /** Timestamp of this turn. */
    timestamp: Date;
}

/** A complete chat session document. */
export interface IChatHistory extends Document {
    /** The userId (null for unauthenticated onboarding sessions). */
    userId: mongoose.Types.ObjectId | null;
    /** Unique session identifier (generated client-side or server-side). */
    sessionId: string;
    /** The type of chat session. */
    sessionType: 'banking' | 'onboarding';
    /** Ordered array of conversation turns. */
    messages: IChatMessage[];
    /** Summary metadata about the session. */
    metadata: {
        /** Total number of user messages. */
        messageCount: number;
        /** Actions executed during this session. */
        actionsExecuted: string[];
        /** User agent string from the first request. */
        userAgent?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        role: { type: String, enum: ['user', 'model'], required: true },
        text: { type: String, required: true },
        actionType: { type: String },
        agent: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false },
);

const ChatHistorySchema = new Schema<IChatHistory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        sessionId: { type: String, required: true, unique: true },
        sessionType: { type: String, enum: ['banking', 'onboarding'], default: 'banking' },
        messages: { type: [ChatMessageSchema], default: [] },
        metadata: {
            messageCount: { type: Number, default: 0 },
            actionsExecuted: { type: [String], default: [] },
            userAgent: { type: String },
        },
    },
    { timestamps: true },
);

// Compound index for efficient session lookups
ChatHistorySchema.index({ userId: 1, sessionType: 1, updatedAt: -1 });
ChatHistorySchema.index({ sessionId: 1 });

export default mongoose.models.ChatHistory ||
    mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
