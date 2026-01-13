import { User, Message, MessageStatus, MessageType } from '../types';

declare global {
    interface Window {
        firebaseDatabase: any;
    }
}

const getDatabase = (): any => {
    if (typeof window === 'undefined') return null;
    
    if (!window.firebaseDatabase) {
        console.error('❌ Firebase Database غير متاح');
        throw new Error('Firebase غير مهيأ. تأكد من تحميل مكتبة Firebase في index.html');
    }
    
    return window.firebaseDatabase;
};

// ============ دوال المستخدمين ============
export const saveUser = (user: User): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            db.ref(`users/${user.id}`).set({
                ...user,
                lastSeen: Date.now()
            }, (error: any) => {
                if (error) {
                    console.error('❌ خطأ في حفظ المستخدم:', error);
                    reject(error);
                } else {
                    console.log('✅ تم حفظ المستخدم:', user.name);
                    resolve();
                }
            });
        } catch (error) {
            console.error('❌ خطأ في saveUser:', error);
            reject(error);
        }
    });
};

export const getUser = (userId: string): Promise<User | null> => {
    return new Promise((resolve) => {
        try {
            const db = getDatabase();
            db.ref(`users/${userId}`).once('value', (snapshot: any) => {
                if (snapshot.exists()) {
                    resolve(snapshot.val());
                } else {
                    resolve(null);
                }
            }, (error: any) => {
                console.error('❌ خطأ في جلب المستخدم:', error);
                resolve(null);
            });
        } catch (error) {
            console.error('❌ خطأ في getUser:', error);
            resolve(null);
        }
    });
};

export const updateUserStatus = (userId: string, isOnline: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            db.ref(`users/${userId}`).update({
                isOnline,
                lastSeen: Date.now()
            }, (error: any) => {
                if (error) reject(error);
                else resolve();
            });
        } catch (error) {
            console.error('❌ خطأ في updateUserStatus:', error);
            reject(error);
        }
    });
};

export const listenToUser = (userId: string, callback: (user: User | null) => void) => {
    try {
        const db = getDatabase();
        const userRef = db.ref(`users/${userId}`);
        
        userRef.on('value', (snapshot: any) => {
            callback(snapshot.exists() ? snapshot.val() : null);
        });
        
        return () => userRef.off('value');
    } catch (error) {
        console.error('❌ خطأ في listenToUser:', error);
        return () => {};
    }
};

// ============ دوال الرسائل ============
export const sendMessage = (message: Omit<Message, 'id'>): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            const messagesRef = db.ref('messages');
            const newMessageRef = messagesRef.push();
            const messageId = newMessageRef.key as string;
            
            const fullMessage: Message = {
                ...message,
                id: messageId,
                time: Date.now(),
                status: 'sent' as MessageStatus
            };
            
            newMessageRef.set(fullMessage, (error: any) => {
                if (error) {
                    console.error('❌ خطأ في إرسال الرسالة:', error);
                    reject(error);
                } else {
                    console.log('✅ تم إرسال الرسالة:', messageId);
                    resolve(messageId);
                }
            });
        } catch (error) {
            console.error('❌ خطأ في sendMessage:', error);
            reject(error);
        }
    });
};

export const listenToMessages = (callback: (messages: Message[]) => void) => {
    try {
        const db = getDatabase();
        const messagesRef = db.ref('messages');
        
        messagesRef.on('value', (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const messagesList: Message[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                callback(messagesList);
            } else {
                callback([]);
            }
        });
        
        return () => messagesRef.off('value');
    } catch (error) {
        console.error('❌ خطأ في listenToMessages:', error);
        return () => {};
    }
};

export const updateMessageStatus = (messageId: string, status: MessageStatus): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            db.ref(`messages/${messageId}`).update({
                status,
                isRead: status === 'read'
            }, (error: any) => {
                if (error) reject(error);
                else resolve();
            });
        } catch (error) {
            console.error('❌ خطأ في updateMessageStatus:', error);
            reject(error);
        }
    });
};

export const getAllUsers = (): Promise<User[]> => {
    return new Promise((resolve) => {
        try {
            const db = getDatabase();
            db.ref('users').once('value', (snapshot: any) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const usersList: User[] = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    resolve(usersList);
                } else {
                    resolve([]);
                }
            }, (error: any) => {
                console.error('❌ خطأ في getAllUsers:', error);
                resolve([]);
            });
        } catch (error) {
            console.error('❌ خطأ في getAllUsers:', error);
            resolve([]);
        }
    });
};

export const getChatMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
    return new Promise((resolve) => {
        try {
            const db = getDatabase();
            db.ref('messages').once('value', (snapshot: any) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const allMessages: Message[] = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    
                    const filteredMessages = allMessages.filter(msg => 
                        (msg.from === userId1 && msg.to === userId2) || 
                        (msg.from === userId2 && msg.to === userId1)
                    ).sort((a, b) => a.time - b.time);
                    
                    resolve(filteredMessages);
                } else {
                    resolve([]);
                }
            }, (error: any) => {
                console.error('❌ خطأ في getChatMessages:', error);
                resolve([]);
            });
        } catch (error) {
            console.error('❌ خطأ في getChatMessages:', error);
            resolve([]);
        }
    });
};

export const deleteMessage = (messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            db.ref(`messages/${messageId}`).remove((error: any) => {
                if (error) reject(error);
                else resolve();
            });
        } catch (error) {
            console.error('❌ خطأ في deleteMessage:', error);
            reject(error);
        }
    });
};

export const getDB = () => getDatabase();
