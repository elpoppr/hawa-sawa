export enum MessageType {
    TEXT = 'text',
    FILE = 'file',
    IMAGE = 'image',
    AI = 'ai'
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface User {
    id: string;
    name: string;
    phone: string;
    isOnline: boolean;
    status: string;
    bio?: string;
    avatar: string;
    lastSeen: number;
    role?: 'admin' | 'user' | 'ai';
    isVerified?: boolean;
    consentedPhones?: string[];
}

export interface Message {
    id: string;
    from: string;
    to: string;
    text: string;
    time: number;
    type: MessageType;
    isRead: boolean;
    status?: MessageStatus;
    fileData?: string;
}