import React, { useState, useEffect, useRef } from 'react';
import { User, Message, MessageType, MessageStatus } from './types';
import { getAIResponse, generateImage } from './services/geminiService';
import { 
    saveUser, 
    getUser, 
    listenToMessages, 
    sendMessage as sendMessageToFirebase,
    updateMessageStatus,
    getAllUsers,
    updateUserStatus
} from './services/firebaseService';
import { 
    PaperAirplaneIcon, 
    FaceSmileIcon, 
    SunIcon,
    MoonIcon,
    ChevronLeftIcon,
    SparklesIcon,
    PhoneIcon,
    VideoCameraIcon,
    XMarkIcon,
    MicrophoneIcon,
    CameraIcon,
    CodeBracketSquareIcon,
    InformationCircleIcon,
    CheckIcon,
    ShieldCheckIcon,
    PowerIcon
} from '@heroicons/react/24/solid';

const DEV_PHONE = "01111973405";
const SUPPORT_PHONE = "911";

const DEFAULT_USERS: User[] = [
    { id: 'ai', name: 'مساعد هوا سوا الذكي', phone: 'AI', isOnline: true, status: 'نشط دائماً ✨', bio: 'أنا مساعدك الذكي المبني على تقنيات Gemini.', avatar: '🤖', lastSeen: Date.now(), role: 'ai', isVerified: true, consentedPhones: [] },
    { id: 'u_support', name: 'الدعم الفني', phone: '911', isOnline: true, status: 'متواجدون لخدمتك 📞', bio: 'القناة الرسمية للدعم الفني.', avatar: '🎧', lastSeen: Date.now(), role: 'admin', isVerified: true, consentedPhones: [] },
    { id: 'u_dev', name: 'المطور/ محمد إيهاب', phone: '01111973405', isOnline: true, status: 'مطور النظام 👑', bio: 'مطور تطبيق هوا سوا الرسمي.', avatar: '👑', lastSeen: Date.now(), role: 'admin', isVerified: true, consentedPhones: [] },
];

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls'>('chats');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeChat, setActiveChat] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [loginPhone, setLoginPhone] = useState('');
    const [loginName, setLoginName] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>(DEFAULT_USERS);
    const [isCalling, setIsCalling] = useState(false);
    const [isVideoCalling, setIsVideoCalling] = useState(false);
    const [isDevConsoleOpen, setIsDevConsoleOpen] = useState(false);
    const [consoleCmd, setConsoleCmd] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ============ تأثيرات جانبية ============
    useEffect(() => {
        const savedUser = localStorage.getItem('hawa_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            setIsLoggedIn(true);
            updateUserStatus(user.id, true).catch(console.error);
            loadUsersFromFirebase();
            
            const unsubscribe = listenToMessages((firebaseMessages) => {
                setMessages(firebaseMessages);
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
            });
            
            return () => {
                unsubscribe();
                if (user) updateUserStatus(user.id, false).catch(console.error);
            };
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn && currentUser) {
            const unsubscribe = listenToMessages((firebaseMessages) => {
                setMessages(firebaseMessages);
            });
            return unsubscribe;
        }
    }, [isLoggedIn, currentUser]);

    // ============ الدوال المساعدة ============
    const loadUsersFromFirebase = async () => {
        try {
            const firebaseUsers = await getAllUsers();
            setAllUsers(prev => {
                const merged = [...DEFAULT_USERS, ...firebaseUsers];
                return merged.filter((user, index, self) =>
                    index === self.findIndex(u => u.id === user.id)
                );
            });
        } catch (error) {
            console.error('❌ خطأ في تحميل المستخدمين:', error);
        }
    };

    const handleLogin = async (e: React.FormEvent | null) => {
        if (e) e.preventDefault();
        const phone = loginPhone.trim();
        if (!phone) return;

        let finalName = loginName || (phone === DEV_PHONE ? "المطور/ محمد إيهاب" : phone === SUPPORT_PHONE ? "الدعم الفني" : "مستخدم جديد");
        let role: 'admin' | 'user' | 'ai' = phone === DEV_PHONE || phone === SUPPORT_PHONE ? 'admin' : 'user';
        let id = phone === DEV_PHONE ? 'u_dev' : phone === SUPPORT_PHONE ? 'u_support' : `u_${phone}`;
        
        const newUser: User = { 
            id, 
            name: finalName, 
            phone, 
            isOnline: true, 
            status: 'متاح الآن ✅', 
            avatar: finalName.charAt(0), 
            lastSeen: Date.now(), 
            role, 
            isVerified: phone === DEV_PHONE || phone === SUPPORT_PHONE,
            consentedPhones: []
        };

        try {
            await saveUser(newUser);
            await updateUserStatus(newUser.id, true);
            setCurrentUser(newUser);
            setIsLoggedIn(true);
            localStorage.setItem('hawa_user', JSON.stringify(newUser));
            await loadUsersFromFirebase();
            console.log('✅ تم تسجيل الدخول بنجاح');
        } catch (error) {
            console.error('❌ خطأ في التسجيل:', error);
            setCurrentUser(newUser);
            setIsLoggedIn(true);
            localStorage.setItem('hawa_user', JSON.stringify(newUser));
        }
    };

    const handleLogout = async () => {
        if (currentUser) {
            try {
                await updateUserStatus(currentUser.id, false);
            } catch (error) {
                console.error('❌ خطأ في تحديث حالة الخروج:', error);
            }
        }
        localStorage.removeItem('hawa_user');
        setCurrentUser(null);
        setIsLoggedIn(false);
        setActiveChat(null);
        setLoginPhone('');
        setLoginName('');
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !activeChat || !currentUser) return;
        
        try {
            const messageId = await sendMessageToFirebase({
                from: currentUser.id,
                to: activeChat.id,
                text: inputText,
                type: MessageType.TEXT,
                isRead: false
            });
            
            setInputText('');
            
            setTimeout(async () => {
                try {
                    await updateMessageStatus(messageId, 'delivered');
                    if (activeChat.role === 'ai' || activeChat.role === 'admin') {
                        setTimeout(async () => {
                            await updateMessageStatus(messageId, 'read');
                        }, 800);
                    }
                } catch (error) {
                    console.error('❌ خطأ في تحديث حالة الرسالة:', error);
                }
            }, 300);
            
            if (activeChat.id === 'ai') {
                setIsTyping(true);
                try {
                    const response = await getAIResponse(inputText);
                    if (response.startsWith('[IMAGE_GEN]')) {
                        const imgUrl = await generateImage(response.replace('[IMAGE_GEN]', '').trim());
                        if (imgUrl) {
                            await sendMessageToFirebase({
                                from: 'ai',
                                to: currentUser.id,
                                text: 'تم إنشاء الصورة بنجاح:',
                                type: MessageType.IMAGE,
                                isRead: true,
                                fileData: imgUrl
                            });
                        }
                    } else {
                        await sendMessageToFirebase({
                            from: 'ai',
                            to: currentUser.id,
                            text: response,
                            type: MessageType.AI,
                            isRead: true
                        });
                    }
                } catch (error) {
                    console.error('❌ خطأ في الرد الذكي:', error);
                } finally {
                    setIsTyping(false);
                }
            }
        } catch (error) {
            console.error('❌ خطأ في إرسال الرسالة:', error);
            const msgId = `m_${Date.now()}`;
            const userMsg: Message = { 
                id: msgId, from: currentUser.id, to: activeChat.id, text: inputText, 
                time: Date.now(), type: MessageType.TEXT, isRead: false, status: 'sent' 
            };
            setMessages(prev => [...prev, userMsg]);
            setInputText('');
        }
    };

    const maskPhone = (phone: string, targetUser: User) => {
        if (currentUser?.phone === DEV_PHONE || currentUser?.phone === SUPPORT_PHONE) return phone;
        if (phone === 'AI') return 'روبوت ذكي';
        if (targetUser.consentedPhones?.includes(currentUser?.id || '')) return phone;
        return phone.slice(0, 3) + "****" + phone.slice(-3);
    };

    const requestPhoneAccess = async (targetId: string) => {
        const targetUser = allUsers.find(u => u.id === targetId);
        if (!targetUser) return;
        
        const updatedUser = {
            ...targetUser,
            consentedPhones: [...(targetUser.consentedPhones || []), currentUser?.id || '']
        };
        
        try {
            await saveUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === targetId ? updatedUser : u));
            if (activeChat?.id === targetId) setActiveChat(updatedUser);
        } catch (error) {
            console.error('❌ خطأ في طلب الرقم:', error);
        }
    };

    const toggleVerification = async (userId: string) => {
        if (currentUser?.phone !== DEV_PHONE) return;
        
        const targetUser = allUsers.find(u => u.id === userId);
        if (!targetUser) return;
        
        const updatedUser = { ...targetUser, isVerified: !targetUser.isVerified };
        
        try {
            await saveUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            if (activeChat?.id === userId) setActiveChat(updatedUser);
        } catch (error) {
            console.error('❌ خطأ في تغيير التوثيق:', error);
        }
    };

    const handleConsoleCommand = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const parts = consoleCmd.split(' ');
            if (parts[0] === 'verify' && parts[1]) {
                const found = allUsers.find(u => u.phone === parts[1]);
                if (found) toggleVerification(found.id);
            } else if (parts[0] === 'logout') {
                handleLogout();
            } else if (parts[0] === 'clear') {
                setMessages([]);
            }
            setConsoleCmd('');
        }
    };

    // ============ واجهة تسجيل الدخول ============
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-['Cairo'] relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] w-full max-w-md animate-chat shadow-2xl relative z-10">
                    <div className="text-center mb-10">
                        <SparklesIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h1 className="text-5xl font-black text-white tracking-tighter">هوا سوا</h1>
                        <p className="text-blue-400 text-[10px] font-bold tracking-[0.4em] uppercase mt-2">عالمك الذكي للتواصل</p>
                    </div>
                    <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
                        <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="رقم الهاتف" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        <input type="text" value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="الاسم المستعار" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        <button className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl text-white shadow-lg transition-all">دخول آمن</button>
                    </form>
                    <p className="mt-8 text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">تطوير: محمد إيهاب</p>
                </div>
            </div>
        );
    }

    // ============ الواجهة الرئيسية ============
    return (
        <div className={`h-screen flex flex-col lg:flex-row overflow-hidden font-['Cairo'] ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-gray-50 text-gray-900'}`}>
            
            {/* الشريط الجانبي */}
            <aside className={`w-full lg:w-[420px] flex flex-col border-l border-white/5 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-white'} ${isMobileMenuOpen ? 'block' : 'hidden lg:flex'}`}>
                <div className="p-8 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl shadow-lg relative">
                            {currentUser?.avatar}
                            {currentUser?.isVerified && <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5"><ShieldCheckIcon className="w-3 h-3 text-white" /></div>}
                        </div>
                        <div>
                            <h2 className="font-black text-xl tracking-tight">هوا سوا</h2>
                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">مرحباً {currentUser?.name.split(' ')[0]}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {currentUser?.phone === DEV_PHONE && (
                            <button onClick={() => setIsDevConsoleOpen(true)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 transition-all shadow-md"><CodeBracketSquareIcon className="w-5 h-5" /></button>
                        )}
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-white/5 rounded-xl transition-colors">
                            {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-blue-600" />}
                        </button>
                        <button onClick={handleLogout} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><PowerIcon className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex p-2 bg-white/5 mx-6 mt-6 rounded-2xl gap-1 shadow-inner">
                    {['chats', 'status', 'calls'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
                            {t === 'chats' ? 'المحادثات' : t === 'status' ? 'الحالات' : 'المكالمات'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
                    {activeTab === 'chats' && allUsers.filter(u => u.id !== currentUser?.id).map(user => (
                        <div key={user.id} onClick={() => { setActiveChat(user); setIsMobileMenuOpen(false); }} className={`p-4 rounded-3xl flex items-center gap-4 cursor-pointer transition-all ${activeChat?.id === user.id ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-white/5'}`}>
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner">{user.avatar}</div>
                                {user.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-[#0f172a] rounded-full"></div>}
                                {user.isVerified && <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-[#0f172a] shadow-md"><ShieldCheckIcon className="w-3 h-3 text-white" /></div>}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-sm">{user.name}</h3>
                                <p className={`text-xs truncate font-bold ${user.isOnline ? 'text-green-500 opacity-100' : 'opacity-60'}`}>{user.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* منطقة الدردشة الرئيسية */}
            <main className={`flex-1 flex flex-col relative ${!activeChat && 'items-center justify-center'}`}>
                {activeChat ? (
                    <>
                        <header className="p-6 border-b border-white/5 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 bg-white/5 rounded-xl"><ChevronLeftIcon className="w-5 h-5" /></button>
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl relative shadow-md">
                                    {activeChat.avatar}
                                    {activeChat.isVerified && <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 shadow-md"><ShieldCheckIcon className="w-3 h-3 text-white" /></div>}
                                </div>
                                <div>
                                    <h2 className="font-black text-lg">{activeChat.name}</h2>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">متصل الآن ✅</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsCalling(true)} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl transition-all hover:bg-blue-600 hover:text-white"><PhoneIcon className="w-6 h-6" /></button>
                                <button onClick={() => setIsVideoCalling(true)} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl transition-all hover:bg-blue-600 hover:text-white"><VideoCameraIcon className="w-6 h-6" /></button>
                                <button onClick={() => setIsInfoOpen(!isInfoOpen)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10"><InformationCircleIcon className="w-6 h-6" /></button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 pattern-dots scrollbar-hide">
                            {messages.filter(m => (m.from === currentUser?.id && m.to === activeChat.id) || (m.from === activeChat.id && m.to === currentUser?.id)).map((msg) => (
                                <div key={msg.id} className={`flex ${msg.from === currentUser?.id ? 'justify-end' : 'justify-start'} animate-chat`}>
                                    <div className={`max-w-[80%] p-5 rounded-[2rem] shadow-xl ${msg.from === currentUser?.id ? 'bg-white text-[#020617] rounded-tr-none' : 'bg-blue-600 text-white rounded-tl-none'}`}>
                                        {msg.type === MessageType.IMAGE ? (
                                            <img src={msg.fileData} className="rounded-2xl max-h-64 object-cover shadow-lg" alt="Media" />
                                        ) : (
                                            <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                                        )}
                                        <div className={`flex justify-between items-center mt-2 ${msg.from === currentUser?.id ? 'text-[#020617]/50' : 'text-white/50'} text-[10px]`}>
                                            <span>{new Date(msg.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                            {msg.from === currentUser?.id && (
                                                <div className="flex -space-x-1 ml-2">
                                                    <CheckIcon className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`} />
                                                    {(msg.status === 'delivered' || msg.status === 'read') && <CheckIcon className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && <div className="text-xs text-blue-500 font-bold italic animate-pulse">يتم المعالجة...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <footer className="p-6">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-3 flex items-center gap-3 shadow-2xl focus-within:border-blue-500/30 transition-all">
                                <button className="p-4 opacity-60 hover:opacity-100 transition-opacity"><FaceSmileIcon className="w-6 h-6" /></button>
                                <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} placeholder="اكتب شيئاً مبدعاً..." className="flex-1 bg-transparent border-none outline-none resize-none font-bold text-sm h-12 py-3" />
                                <button onClick={sendMessage} className="p-4 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 transform active:scale-95 transition-all"><PaperAirplaneIcon className="w-6 h-6" /></button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="text-center p-12 max-w-md">
                        <SparklesIcon className="w-24 h-24 text-blue-500 mx-auto mb-8 animate-bounce" />
                        <h2 className="text-3xl font-black mb-2">مرحباً بك في هوا سوا</h2>
                        <p className="opacity-50 font-bold leading-loose">ابدأ بتحديد جهة اتصال من القائمة الجانبية للدخول في تجربة تواصل آمنة وفريدة من نوعها.</p>
                    </div>
                )}
            </main>

            {/* نافذة معلومات المستخدم */}
            {isInfoOpen && activeChat && (
                <aside className="fixed inset-y-0 right-0 w-full lg:w-[400px] z-[100] bg-[#0f172a] border-r border-white/5 shadow-2xl animate-chat flex flex-col">
                    <div className="p-8 flex justify-between items-center border-b border-white/5">
                        <h3 className="font-black text-xl">ملف التعريف</h3>
                        <button onClick={() => setIsInfoOpen(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 flex items-center justify-center text-5xl mb-6 relative shadow-2xl">
                            {activeChat.avatar}
                            {activeChat.isVerified && <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-2 border-4 border-[#0f172a] shadow-lg"><ShieldCheckIcon className="w-6 h-6 text-white" /></div>}
                        </div>
                        <h4 className="text-2xl font-black mb-1 text-center">{activeChat.name}</h4>
                        <p className="text-blue-500 font-bold mb-8 text-sm uppercase tracking-widest">{activeChat.status}</p>

                        <div className="w-full space-y-6">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">رقم الهاتف (محمي)</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-lg font-bold tracking-tighter">{maskPhone(activeChat.phone, activeChat)}</span>
                                    {!activeChat.consentedPhones?.includes(currentUser?.id || '') && activeChat.phone !== 'AI' && activeChat.phone !== SUPPORT_PHONE && activeChat.phone !== DEV_PHONE && (
                                        <button onClick={() => requestPhoneAccess(activeChat.id)} className="text-[10px] bg-blue-600/20 text-blue-500 px-4 py-1.5 rounded-full font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-md">
                                            طلب الرقم
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">السيرة الذاتية</p>
                                <p className="text-sm font-bold opacity-80 leading-relaxed text-right">{activeChat.bio || "عضو مميز في مجتمع هوا سوا."}</p>
                            </div>
                            {currentUser?.phone === DEV_PHONE && (
                                <button onClick={() => toggleVerification(activeChat.id)} className={`w-full py-5 rounded-[2rem] font-black transition-all shadow-lg ${activeChat.isVerified ? 'bg-red-600/20 text-red-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                                    {activeChat.isVerified ? 'سحب التوثيق' : 'توثيق الحساب'}
                                </button>
                            )}
                        </div>
                    </div>
                </aside>
            )}

            {/* وحدة تحكم المطور */}
            {isDevConsoleOpen && (
                <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md p-10 flex items-center justify-center">
                    <div className="w-full max-w-4xl bg-[#080808] border border-white/10 rounded-[2.5rem] flex flex-col h-[70vh] shadow-[0_0_100px_rgba(37,99,235,0.2)] overflow-hidden">
                        <div className="p-5 bg-white/5 flex justify-between items-center border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-[10px] font-black uppercase text-gray-500 ml-4 tracking-[0.3em]">Hawa Sawa Root Shell v2.1</span>
                            </div>
                            <button onClick={() => setIsDevConsoleOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 p-8 font-mono text-xs text-green-500 overflow-y-auto">
                            <p className="text-blue-500 font-bold mb-4">Lead Architect Terminal Session - Secure Connection</p>
                            <p>> System ID: 0x827361928</p>
                            <p>> Active Users: {allUsers.length}</p>
                            <p className="mt-4 text-white font-bold underline"># الأوامر المتاحة:</p>
                            <p className="opacity-70"> - verify [رقم] : توثيق أو إلغاء توثيق حساب</p>
                            <p className="opacity-70"> - logout : تسجيل الخروج الإجباري</p>
                            <p className="opacity-70"> - clear : مسح سجل المحادثات</p>
                            <div className="flex mt-8 items-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <span className="text-blue-500 font-black">$</span>
                                <input autoFocus value={consoleCmd} onChange={e => setConsoleCmd(e.target.value)} onKeyDown={handleConsoleCommand} className="bg-transparent border-none outline-none flex-1 font-bold text-green-400" placeholder="أدخل الأمر هنا..." />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* نافذة المكالمة */}
            {(isCalling || isVideoCalling) && (
                <div className="fixed inset-0 z-[1000] bg-[#020617]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-chat">
                    <div className="text-center mb-16">
                        <div className="w-32 h-32 bg-blue-600/20 rounded-[3.5rem] flex items-center justify-center mx-auto mb-8 relative shadow-2xl">
                            <div className="absolute inset-0 bg-blue-600 animate-ping opacity-10 rounded-[3.5rem]"></div>
                            {isVideoCalling ? <VideoCameraIcon className="w-16 h-16 text-blue-500" /> : <MicrophoneIcon className="w-16 h-16 text-blue-500" />}
                        </div>
                        <h2 className="text-4xl font-black mb-2">{activeChat?.name}</h2>
                        <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[10px]">{isVideoCalling ? 'Video Stream' : 'Voice Stream'}</p>
                    </div>
                    <button onClick={() => { setIsCalling(false); setIsVideoCalling(false); }} className="p-8 bg-red-600 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.3)] hover:scale-110 active:scale-90 transition-all group">
                        <XMarkIcon className="w-10 h-10 text-white group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;