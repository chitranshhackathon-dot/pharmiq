import React, { useState, useEffect } from 'react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { 
  BookOpen, 
  Play, 
  HelpCircle, 
  Download, 
  TrendingUp, 
  Flame, 
  Award, 
  LogOut, Trash2, Menu,
  User, 
  Clock, 
  CheckCircle, 
  FileText, 
  Send, 
  Plus, 
  Search, 
  ArrowRight, 
  Settings, 
  ChevronRight, 
  Lock, 
  Sparkles, 
  Camera, 
  Maximize, 
  AlertCircle,
  X
} from 'lucide-react';


// Supabase client removed

// ==========================================
// MOCK DATA FOR PHARMIQ PLATFORM
// ==========================================

interface VideoLecture {
  id: string;
  title: string;
  subject: string;
  duration: string;
  instructor: string;
  videoUrl: string; // simulated description or board text
  views: string;
  isPremium: boolean;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentType?: string;
  goal?: string;
  batch?: string;
  fileUrl?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject: string;
  goal?: string;
  batch?: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  type: string; // PDF, Chart, Monograph
  size: string;
  subject: string;
  isPremium: boolean;
  goal?: string;
  batch?: string;
  fileUrl?: string;
}

interface DoubtItem {
  id: string;
  question: string;
  imageUrl?: string;
  answer: string;
  timestamp: string;
  likes: number;
}

const INITIAL_LECTURES: VideoLecture[] = [];

const INITIAL_QUIZ: QuizQuestion[] = [];
const INITIAL_STUDY_MATERIALS: StudyMaterial[] = [];
const INITIAL_DOUBTS: DoubtItem[] = [];;

export default function App() {
  // ==========================================
  // CORE APP STATES
  // ==========================================
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('pharmiq_token') !== null && localStorage.getItem('pharmiq_onboarded') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('pharmiq_username') || '';
  });
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    return localStorage.getItem('pharmiq_goal') || '';
  });
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(() => {
    return localStorage.getItem('pharmiq_premium') === 'true';
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('pharmiq_role') || 'student';
  });
  const [userBatch, setUserBatch] = useState<string>(() => {
    return localStorage.getItem('pharmiq_batch') || '';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('pharmiq_email') || '';
  });

  // ==========================================
  // BACKEND AUTHENTICATION STATES
  // ==========================================
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('pharmiq_token');
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  // Initialize Native Capacitor Google Auth
  useEffect(() => {
    try {
      GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '107382218764-dummy.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    } catch (e) {
      console.warn('GoogleAuth init warning:', e);
    }
  }, []);

  // Dynamically configure the backend API Base URL based on the running context (Web vs Android Mobile)
  const getApiUrl = (path: string): string => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return `${envUrl}${path}`;
    
    // Automatically detect Android environment
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      return `http://10.0.2.2:3001${path}`;
    }
    
    return `http://localhost:3001${path}`;
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;
      const displayName = (googleUser as any).name || (googleUser as any).displayName || 'Google Student';
      
      if (!idToken) throw new Error('Google Sign-in did not return an ID token.');
      
      const res = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken, goal: selectedGoal || '' }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed on backend');
      
      const userToken = data.token;
      const userObj = data.user || {};
      
      localStorage.setItem('pharmiq_token', userToken);
      localStorage.setItem('pharmiq_username', userObj.username || displayName);
      localStorage.setItem('pharmiq_role', userObj.role || 'student');
      localStorage.setItem('pharmiq_email', userObj.email || '');
      localStorage.setItem('pharmiq_premium', userObj.isPremiumUser ? 'true' : 'false');
      localStorage.setItem('pharmiq_goal', userObj.goal || selectedGoal || '');
      
      setToken(userToken);
      setUsername(userObj.username || displayName);
      setSelectedGoal(userObj.goal || selectedGoal || '');
      setUserRole(userObj.role || 'student');
      setUserEmail(userObj.email || '');
      setIsPremiumUser(userObj.isPremiumUser || false);
      setOnboarded(true);
      addToast('Signed in with Google successfully!', 'success');
    } catch (err: any) {
      console.error('Native Google Sign-In Error:', err);
      if (err.message && !err.message.includes('canceled')) {
        setAuthError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in email and password.');
      return;
    }
    if (authMode === 'signup' && !username.trim()) {
      setAuthError('Please enter your name.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    const endpoint = authMode === 'signup' ? 'signup' : 'login';
    const payload = authMode === 'signup'
      ? { email: authEmail, password: authPassword, username, goal: selectedGoal || '' }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(getApiUrl(`/api/auth/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (!data || !data.token || !data.user) {
        throw new Error('Invalid authentication response from server.');
      }

      const userToken = data.token;
      const userObj = data.user;
      const userUsername = userObj.username || username || 'Student';
      const userGoal = userObj.goal || selectedGoal || '';
      const userBatchValue = userObj.batch || '';
      const userPremium = userObj.isPremiumUser ?? false;
      const userRoleStr = userObj.role || 'student';
      const userStreak = userObj.streakDays ?? 1;
      const userXp = userObj.xpPoints ?? 150;
      const userEmailVal = userObj.email || authEmail || '';

      localStorage.setItem('pharmiq_token', userToken);
      localStorage.setItem('pharmiq_username', userUsername);
      localStorage.setItem('pharmiq_goal', userGoal);
      localStorage.setItem('pharmiq_batch', userBatchValue);
      localStorage.setItem('pharmiq_premium', userPremium ? 'true' : 'false');
      localStorage.setItem('pharmiq_role', userRoleStr);
      localStorage.setItem('pharmiq_email', userEmailVal);

      setToken(userToken);
      setUsername(userUsername);
      setSelectedGoal(userGoal);
      setUserBatch(userBatchValue);
      setIsPremiumUser(userPremium);
      setUserRole(userRoleStr);
      setUserEmail(userEmailVal);
      setStreakDays(userStreak);
      setXpPoints(userXp);

      if (data.isNewUser === false) {
        localStorage.setItem('pharmiq_onboarded', 'true');
        setOnboarded(true);
      }

      addToast(authMode === 'signup' ? 'Account created successfully!' : 'Logged in successfully!', 'success');
    } catch (err: any) {
      console.error('Credentials Authentication Error:', err);
      setAuthError(err.message || 'Server connection failed. Is your backend running?');
    } finally {
      setAuthLoading(false);
    }
  };
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // 0% to 50%

  // ==========================================
  // EXTENSIBLE / MUTABLE DATA IN MEMORY (ADMIN MUTATION)
  // ==========================================
  const [lectures, setLectures] = useState<VideoLecture[]>(INITIAL_LECTURES);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(INITIAL_QUIZ);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(INITIAL_STUDY_MATERIALS);
  const [doubtList, setDoubtList] = useState<DoubtItem[]>(INITIAL_DOUBTS);

  // ==========================================
  // LECTURES PLAYBACK STATES
  // ==========================================
  const [selectedLecture, setSelectedLecture] = useState<VideoLecture | null>(INITIAL_LECTURES.length > 0 ? INITIAL_LECTURES[0] : null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoProgress, setVideoProgress] = useState<number>(24); // 0 - 100%
  const [videoNotes, setVideoNotes] = useState<{ timestamp: string; note: string }[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [lectureSearch, setLectureSearch] = useState<string>('');


  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentProfiles, setStudentProfiles] = useState<{
    id: string;
    username: string;
    email: string;
    role: string;
    isPremiumUser: boolean;
    goal: string;
    xp: number;
    streak: number;
    batch?: string;
  }[]>([]);

  // ==========================================
  // FREE TIER RESTRICTION STATES
  // ==========================================
  const [viewedLectureIds, setViewedLectureIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('pharmiq_viewed_lec_ids') || '[]');
  });

  const [aiDoubtsAskedCount, setAiDoubtsAskedCount] = useState<number>(() => {
    return Number(localStorage.getItem('pharmiq_ai_doubts') || '0');
  });

  // ==========================================
  // QUIZ ENGINE STATES
  // ==========================================
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // ==========================================
  // AI DOUBT SOLVER STATES
  // ==========================================
  const [doubtText, setDoubtText] = useState<string>('');
  const [doubtImage, setDoubtImage] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ sender: 'student' | 'ai'; text: string; image?: string }[]>([
    { sender: 'ai', text: 'Hello! I am your PharmIQ AI Assistant. Take a picture of a chemical structure, formulate, or type your pharmacology and pharmaceutics doubt. I will solve it instantly!' }
  ]);

  // ==========================================
  // ADMIN PANEL PANEL MUTATION FORM STATES
  // ==========================================
  const [adminLectureTitle, setAdminLectureTitle] = useState<string>('');
  const [adminLectureSubject, setAdminLectureSubject] = useState<string>('Pharmacology');
  const [adminLectureDuration, setAdminLectureDuration] = useState<string>('45 min');
  const [adminLecturePremium, setAdminLecturePremium] = useState<boolean>(false);
  const [adminLectureType, setAdminLectureType] = useState<'youtube' | 'pdf'>('youtube');
  const [adminLectureUrl, setAdminLectureUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [adminBatches, setAdminBatches] = useState<{ id: string; name: string }[]>([]);
  const [adminSubjects, setAdminSubjects] = useState<{ id: string; name: string; batchId: string }[]>([]);
  const [adminNewBatch, setAdminNewBatch] = useState<string>('');
  const [adminNewSubject, setAdminNewSubject] = useState<string>('');
  const [adminNewSubjectBatchId, setAdminNewSubjectBatchId] = useState<string>('');

  const [adminLectureBatch, setAdminLectureBatch] = useState<string>('');
  const [adminQuestionBatch, setAdminQuestionBatch] = useState<string>('');

  const [adminQuestionText, setAdminQuestionText] = useState<string>('');
  const [adminQuestionOptA, setAdminQuestionOptA] = useState<string>('');
  const [adminQuestionOptB, setAdminQuestionOptB] = useState<string>('');
  const [adminQuestionOptC, setAdminQuestionOptC] = useState<string>('');
  const [adminQuestionOptD, setAdminQuestionOptD] = useState<string>('');
  const [adminQuestionCorrect, setAdminQuestionCorrect] = useState<number>(0);
  const [adminQuestionExpl, setAdminQuestionExpl] = useState<string>('');
  const [adminQuestionSubject, setAdminQuestionSubject] = useState<string>('Pharmacology');



  // ==========================================
  // STREAK & MOTIVATION STATE
  // ==========================================
  const [streakDays, setStreakDays] = useState<number>(5);
  const [xpPoints, setXpPoints] = useState<number>(1240);
  const [showMotivationOverlay, setShowMotivationOverlay] = useState<boolean>(false);

  // ==========================================
  // TOAST UTILITIES
  // ==========================================
  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };


  // Load and synchronize dynamic lectures, materials, and questions
  useEffect(() => {
    const syncData = () => {
      // 1. Lectures
      fetch(getApiUrl('/api/lectures'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            // Merge dynamic lectures with initial defaults (preserving initial defaults at bottom)
            const dynamicIds = new Set(data.map(l => l.id));
            const merged = [...data, ...INITIAL_LECTURES.filter(l => !dynamicIds.has(l.id))];
            setLectures(merged);
          }
        })
        .catch(() => {});

      // 2. Study Materials
      fetch(getApiUrl('/api/materials'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const dynamicIds = new Set(data.map(m => m.id));
            const merged = [...data, ...INITIAL_STUDY_MATERIALS.filter(m => !dynamicIds.has(m.id))];
            setStudyMaterials(merged);
          }
        })
        .catch(() => {});

      // 3. Quiz Questions
      fetch(getApiUrl('/api/questions'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const dynamicIds = new Set(data.map(q => q.id));
            const merged = [...INITIAL_QUIZ.filter(q => !dynamicIds.has(q.id)), ...data];
            setQuizQuestions(merged);
          }
        })
        .catch(() => {});

      // 4. Subjects
      fetch(getApiUrl('/api/subjects'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAdminSubjects(data);
        })
        .catch(() => {});

      // 5. Batches
      fetch(getApiUrl('/api/batches'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAdminBatches(data);
        })
        .catch(() => {});
    };

    syncData();
    const interval = setInterval(syncData, 3000); // Polling sync every 3 seconds!
    return () => clearInterval(interval);
  }, []);

  const fetchStudentProfiles = () => {
    fetch(getApiUrl('/api/admin/users'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStudentProfiles(data);
      })
      .catch(err => console.error('Error fetching student profiles:', err));
  };

  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'admin') {
      fetchStudentProfiles();
    }
  }, [activeTab, userRole]);

  // Sync state to localstorage
  useEffect(() => {
    if (onboarded) {
      localStorage.setItem('pharmiq_onboarded', 'true');
      localStorage.setItem('pharmiq_username', username);
      localStorage.setItem('pharmiq_goal', selectedGoal);
    }
  }, [onboarded, username, selectedGoal]);

  useEffect(() => {
    localStorage.setItem('pharmiq_premium', isPremiumUser ? 'true' : 'false');
  }, [isPremiumUser]);

  // Video progress simulated effect
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            addToast('Lecture completed! Earned 50 XP!', 'success');
            setXpPoints(x => x + 50);
            return 100;
          }
          return prev + (0.5 * playbackSpeed);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);



  // Synchronized Dynamic AI Doubt Solver
  const handleAskDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtText.trim() && !doubtImage) return;

    if (!isPremiumUser) {
      if (aiDoubtsAskedCount >= 2) {
        addToast('Free Tier Limit: Standard plan permits only 2 AI solutions.', 'info');
        setShowSubscriptionModal(true);
        return;
      }
      setAiDoubtsAskedCount(prev => {
        const next = prev + 1;
        localStorage.setItem('pharmiq_ai_doubts', String(next));
        return next;
      });
    }

    const studentMessage = doubtText;
    const currentImg = doubtImage;
    
    // Add student message to history
    setChatHistory(prev => [
      ...prev,
      { sender: 'student', text: studentMessage || 'Inquired about the uploaded chemical structure.', image: currentImg || undefined }
    ]);

    setDoubtText('');
    setDoubtImage(null);
    setIsAiThinking(true);

    fetch(getApiUrl('/api/ai/solve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: studentMessage || 'Visual Chemical structure inquiry.' })
    })
      .then(res => res.json())
      .then(data => {
        const aiResponseText = data.answer || 'Apologies, we could not generate a response. Please check your network connection.';
        
        setChatHistory(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
        setIsAiThinking(false);
        setXpPoints(x => x + 15);
        addToast('Solved! Earned 15 XP!', 'success');
        
        // Auto save to doubt forum list
        const newDoubtItem: DoubtItem = {
          id: `d_new_${Date.now()}`,
          question: studentMessage || 'Visual Chemical structure inquiry.',
          answer: aiResponseText,
          timestamp: 'Just now',
          likes: 0
        };
        setDoubtList(prev => [newDoubtItem, ...prev]);
      })
      .catch(err => {
        console.error('AI Solver error:', err);
        setIsAiThinking(false);
        addToast('AI Solver connection failed.', 'info');
      });
  };

  // WhatsApp admission payment redirection flow
  const handlePaymentSubmit = (planName: string, amount: number) => {
    const finalPrice = Math.round(amount * (1 - appliedDiscount));
    addToast('Opening WhatsApp to contact Pharmiq Admissions counselor...', 'info');
    
    const adminPhone = '9125048085'; // Admin mobile number
    const message = `Hi Pharmiq Admin, I am "${username}" (Email: ${userEmail || 'Not Provided'}). I want to unlock Premium Access for the "${planName}" (Price: ₹${finalPrice}). Please share the UPI / Payment QR code!`;
    
    setTimeout(() => {
      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
      setShowSubscriptionModal(false);
      addToast('WhatsApp Helpdesk loaded successfully! Please message the Admin for activation.', 'success');
    }, 600);
  };

  // Coupon code handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'PHARMIQ50' || couponCode.toUpperCase() === 'GPAT50') {
      setAppliedDiscount(0.5);
      addToast('Success! 50% discount coupon applied successfully!', 'success');
    } else {
      addToast('Invalid Coupon Code.', 'info');
    }
  };





  const handleAdminAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewSubject.trim() || !adminNewSubjectBatchId) {
      addToast('Please enter subject name and select a batch', 'info');
      return;
    }
    try {
      const res = await fetch(getApiUrl('/api/subjects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `sub_${Date.now()}`, name: adminNewSubject, batchId: adminNewSubjectBatchId })
      });
      if (res.ok) {
        addToast('Subject added successfully', 'success');
        setAdminNewSubject('');
      }
    } catch (err) {}
  };

  const handleAdminDeleteSubject = async (id: string) => {
    try {
      await fetch(getApiUrl(`/api/subjects/${id}`), { method: 'DELETE' });
      addToast('Subject deleted', 'info');
    } catch (err) {}
  };

  const handleAdminAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewBatch.trim()) return;
    try {
      const res = await fetch(getApiUrl('/api/batches'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `bat_${Date.now()}`, name: adminNewBatch })
      });
      if (res.ok) {
        addToast('Batch added successfully', 'success');
        setAdminNewBatch('');
      }
    } catch (err) {}
  };

  const handleAdminDeleteBatch = async (id: string) => {
    try {
      await fetch(getApiUrl(`/api/batches/${id}`), { method: 'DELETE' });
      addToast('Batch deleted', 'info');
    } catch (err) {}
  };

  const handleAdminAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLectureTitle || !adminLectureUrl) {
      addToast('Please provide a title and URL', 'info');
      return;
    }

    setIsUploading(true);
    addToast('Linking external content...', 'info');

    if (adminLectureType === 'youtube') {
      const newLec: VideoLecture = {
        id: `l_${Date.now()}`,
        title: adminLectureTitle,
        subject: adminLectureSubject,
        duration: adminLectureDuration || 'YouTube VOD',
        instructor: 'Guest Faculty Speaker',
        videoUrl: adminLectureUrl,
        views: '0',
        isPremium: adminLecturePremium,
        goal: selectedGoal,
        batch: adminLectureBatch
      };
      setLectures(prev => [newLec, ...prev]);
      
      await fetch(getApiUrl('/api/lectures'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLec)
      }).catch(err => console.error('Error syncing lecture:', err));
      
      addToast('New YouTube Lecture linked successfully!', 'success');
    } else {
      const newMaterial: StudyMaterial = {
        id: `mat_${Date.now()}`,
        title: adminLectureTitle,
        type: 'PDF Notes',
        size: 'External Link',
        subject: adminLectureSubject,
        isPremium: adminLecturePremium,
        goal: selectedGoal,
        batch: adminLectureBatch,
        fileUrl: adminLectureUrl
      };
      setStudyMaterials(prev => [newMaterial, ...prev]);
      
      await fetch(getApiUrl('/api/materials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
      }).catch(err => console.error('Error syncing material:', err));
      
      addToast('New PDF Notes linked successfully!', 'success');
    }

    setAdminLectureTitle('');
    setAdminLectureUrl('');
    setIsUploading(false);
  };

  const handleAdminAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminQuestionText || !adminQuestionOptA || !adminQuestionOptB || !adminQuestionOptC || !adminQuestionOptD) {
      addToast('Please fill all fields for the question.', 'info');
      return;
    }

    const newQ: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: adminQuestionText,
      options: [adminQuestionOptA, adminQuestionOptB, adminQuestionOptC, adminQuestionOptD],
      correctIndex: Number(adminQuestionCorrect),
      explanation: adminQuestionExpl || 'No explanation provided by Faculty.',
      subject: adminQuestionSubject,
      goal: selectedGoal,
      batch: adminQuestionBatch
    };

    setQuizQuestions(prev => [...prev, newQ]);

    // POST to backend sync
    fetch(getApiUrl('/api/questions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQ)
    }).catch(err => console.error('Error syncing question:', err));
    
    // reset form
    setAdminQuestionText('');
    setAdminQuestionOptA('');
    setAdminQuestionOptB('');
    setAdminQuestionOptC('');
    setAdminQuestionOptD('');
    setAdminQuestionExpl('');
    
    addToast('New Mock Question successfully injected!', 'success');
  };

  const handleAdminUpdateUser = (userId: string, updates: { goal?: string; isPremiumUser?: boolean; batch?: string }) => {
    fetch(getApiUrl(`/api/admin/users/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addToast('Student profile enrollment updated successfully!', 'success');
          fetchStudentProfiles(); // Refresh local catalog state
        } else {
          addToast('Failed to update student profile.', 'info');
        }
      })
      .catch(err => {
        console.error('Error updating student profile:', err);
        addToast('Error updating student profile.', 'info');
      });
  };

  const handleAdminDeleteUser = (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    
    fetch(getApiUrl(`/api/admin/users/${userId}`), {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addToast('User permanently deleted!', 'success');
          fetchStudentProfiles();
        } else {
          addToast('Failed to delete user.', 'info');
        }
      })
      .catch(err => {
        console.error('Error deleting user:', err);
        addToast('Error deleting user.', 'info');
      });
  };

  const handleAdminDeleteLecture = (lectureId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this lecture?')) return;
    
    fetch(getApiUrl(`/api/lectures/${lectureId}`), {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addToast('Lecture permanently deleted!', 'success');
          setLectures(prev => prev.filter(l => l.id !== lectureId));
        } else {
          addToast('Failed to delete lecture.', 'info');
        }
      })
      .catch(err => {
        console.error('Error deleting lecture:', err);
        addToast('Error deleting lecture.', 'info');
      });
  };

  const handleAdminDeleteMaterial = (materialId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this reference study note?')) return;
    
    fetch(getApiUrl(`/api/materials/${materialId}`), {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addToast('Reference study notes deleted successfully!', 'success');
          setStudyMaterials(prev => prev.filter(m => m.id !== materialId));
        } else {
          addToast('Failed to delete reference notes.', 'info');
        }
      })
      .catch(err => {
        console.error('Error deleting material:', err);
        addToast('Error deleting study material.', 'info');
      });
  };



  // Mock Question quiz answering logic
  const handleSelectOption = (idx: number) => {
    if (hasSubmittedAnswer) return;
    setSelectedOptionIndex(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || hasSubmittedAnswer) return;
    
    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedOptionIndex === currentQ.correctIndex;
    
    if (isCorrect) {
      setQuizScore(s => s + 1);
      setXpPoints(x => x + 25);
      addToast('Correct Answer! +25 XP', 'success');
    } else {
      addToast('Incorrect. Read the explanation below.', 'info');
    }

    setHasSubmittedAnswer(true);
  };

  const handleNextQuestion = () => {
    setSelectedOptionIndex(null);
    setHasSubmittedAnswer(false);
    
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
      addToast(`${selectedGoal} practice mock test complete! Check your stats.`, 'success');
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setHasSubmittedAnswer(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  // Mock snap image for doubt solving
  const handleSimulateCameraSnap = () => {
    addToast('Simulating Camera Snapshot of Textbook Question...', 'info');
    setTimeout(() => {
      // Mock base64 representation of a chemistry structure
      setDoubtImage('https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=400&q=80');
      addToast('Chemical formulation diagram snapped successfully!', 'success');
    }, 800);
  };

  // Real programmatic file download
  const handleDownloadMaterial = (material: StudyMaterial) => {
    if (material.isPremium && !isPremiumUser) {
      addToast('Upgrade to premium Gold tier to download this material.', 'info');
      setShowSubscriptionModal(true);
      return;
    }
    
    if (material.fileUrl) {
      addToast(`Downloading "${material.title}" securely from cloud...`, 'info');
      const a = document.createElement('a');
      a.href = material.fileUrl;
      a.download = material.title;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast(`Download Complete: ${material.title}`, 'success');
      return;
    }

    // Fallback to placeholder if no real file was uploaded
    addToast(`Preparing "${material.title}" download files...`, 'info');
    setTimeout(() => {
      try {
        const content = `PHARMIQ STUDY MATERIAL\n\nDocument Title: ${material.title}\nDownloaded on: ${new Date().toLocaleString()}\n\n---\nThis is a dynamic placeholder file generated by the Jupitor Education platform.\nIn a full production environment, this securely streams the actual binary PDF payload directly from your Supabase Storage buckets.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        let filename = material.title;
        if (filename.toLowerCase().endsWith('.pdf')) filename = filename.replace(/\.pdf$/i, '.txt');
        else if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(`Download Complete: ${material.title}`, 'success');
      } catch (err) {
        addToast('Error triggering file download.', 'info');
        console.error(err);
      }
    }, 1200);
  };

  const activeQuestions = quizQuestions
    .filter(q => (!q.goal || q.goal === selectedGoal) && (!q.batch || q.batch === selectedGoal || q.batch === userBatch));

  const filteredLectures = lectures
    .filter(l => (!l.goal || l.goal === selectedGoal) && (!l.batch || l.batch === selectedGoal || l.batch === userBatch));

  const filteredStudyMaterials = studyMaterials
    .filter(m => (!m.goal || m.goal === selectedGoal) && (!m.batch || m.batch === selectedGoal || m.batch === userBatch));

  return (
    <div className="app-wrapper">
      {showGoalModal && (
        <div className="onboarding-overlay" style={{ zIndex: 9999 }}>
          <div className="onboarding-card glass-card" style={{ maxWidth: '400px', padding: '30px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', border: '2px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'white', fontWeight: 'bold' }}>🎯 Select Target Pharmacy Goal</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
              Choose your competitive exam goal to customize your syllabus chapters, AI doubt solver, and MCQs.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {(adminBatches.length > 0 ? adminBatches.map(b => b.name) : []).map((goal) => (
                <div
                  key={goal}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: selectedGoal === goal ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    background: selectedGoal === goal ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: selectedGoal === goal ? 'white' : 'var(--text-primary)',
                    transition: 'var(--transition-smooth)',
                    boxShadow: selectedGoal === goal ? '0 0 12px rgba(139, 92, 246, 0.2)' : 'none'
                  }}
                  onClick={() => {
                    setSelectedGoal(goal);
                    localStorage.setItem('pharmiq_goal', goal);
                    addToast(`Target goal updated to ${goal}!`, 'success');
                    setShowGoalModal(false);
                  }}
                >
                  {goal}
                </div>
              ))}
            </div>
            
            <button className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={() => setShowGoalModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* ==========================================
        ONBOARDING SCREEN OVERLAY
        ========================================== */}
      {/* ==========================================
        AUTHENTICATION & ONBOARDING SCREEN OVERLAY
        ========================================== */}
      {!token && (
        <div className="onboarding-overlay">
          <div className="onboarding-card glass-card" style={{ maxWidth: '520px', padding: '36px' }}>
            <div className="onboarding-brand" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
    <img src="/logo.jpg" alt="Jupitor Education Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
  </div>
            <h2 className="onboarding-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Welcome to Jupitor Education</h2>
            <p className="onboarding-subtitle" style={{ fontSize: '13px', marginBottom: '24px' }}>
              India's Premier EdTech Hub for Competitive Pharmacy Exams
            </p>

            {/* Auth Mode Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                className={`btn ${authMode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }}
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn ${authMode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }}
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <div className="glass-card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                color: 'var(--danger)',
                fontSize: '12px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            {/* Main Auth Form */}
            <form onSubmit={handleCredentialsAuth}>
              {authMode === 'signup' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Anjali Sharma"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@email.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '20px' }}
                disabled={authLoading}
              >
                {authLoading ? 'Verifying Session...' : authMode === 'signup' ? 'Sign Up with Email' : 'Sign In with Email'}
                {!authLoading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Or Sign In With</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
            </div>

            {/* Google Authentication Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
              {/* Native Google Auth Button wrapper */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
    <button 
      type="button"
      className="btn btn-secondary" 
      onClick={handleGoogleSignIn} 
      disabled={authLoading}
      style={{ width: '100%', background: 'white', color: '#333', fontWeight: 'bold' }}
    >
      <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '16px', marginRight: '8px' }} />
      Continue with Google
    </button>
  </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
        POST-LOGIN COURSE SELECTION OVERLAY
        ========================================== */}
      {token && !onboarded && (
        <div className="onboarding-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(20px)' }}>
          <div className="onboarding-card glass-card fade-in-up" style={{ maxWidth: '700px', width: '90%', padding: '40px', background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.95) 100%)', border: '2px solid rgba(139, 92, 246, 0.3)' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '12px', color: 'white', textAlign: 'center', fontWeight: '800' }}>
              Welcome to <span style={{ color: 'var(--primary-glow)' }}>Jupitor Education</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>
              To personalize your syllabus, AI solver, and MCQs, please select your primary target course.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {(adminBatches.length > 0 ? adminBatches.map(b => ({ name: b.name, desc: 'Target Batch Syllabus' })) : []).map((course) => (
                <div
                  key={course.name}
                  style={{
                    padding: '20px 16px',
                    borderRadius: '16px',
                    border: '2px solid',
                    borderColor: selectedGoal === course.name ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    background: selectedGoal === course.name ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedGoal === course.name ? '0 0 20px rgba(139, 92, 246, 0.3)' : 'none',
                    transform: selectedGoal === course.name ? 'translateY(-4px)' : 'none'
                  }}
                  onClick={() => setSelectedGoal(course.name)}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: selectedGoal === course.name ? 'white' : 'var(--text-primary)', marginBottom: '8px' }}>
                    {course.name}
                  </div>
                  <div style={{ fontSize: '11px', color: selectedGoal === course.name ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {course.desc}
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', borderRadius: '12px', letterSpacing: '0.5px' }} 
              onClick={async () => {
                if (!selectedGoal) {
                  addToast('Please select a course to continue.', 'info');
                  return;
                }
                
                try {
                  const res = await fetch(getApiUrl('/api/user/update-goal'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ goal: selectedGoal })
                  });
                  if (res.ok) {
                     localStorage.setItem('pharmiq_goal', selectedGoal);
                     localStorage.setItem('pharmiq_onboarded', 'true');
                     setOnboarded(true);
                     addToast(`Welcome! Your dashboard is now set for ${selectedGoal}.`, 'success');
                  } else {
                     addToast('Failed to sync course selection to server.', 'info');
                  }
                } catch (e) {
                   addToast('Network error while syncing course selection.', 'info');
                }
              }}
            >
              Confirm Course & Enter Dashboard <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
        SIDEBAR NAVIGATION PANEL
        ========================================== */}
      {token && (
        <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <BookOpen size={20} />
          </div>
          <span className="logo-text">Jupitor Education</span>
          <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>v1.0</span>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); }}
          >
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`}
            onClick={() => { setActiveTab('lectures'); }}
          >
            <Play size={18} />
            <span>Video Lectures</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => { setActiveTab('quiz'); }}
          >
            <HelpCircle size={18} />
            <span>Practice & Tests</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'doubt' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doubt'); }}
          >
            <Sparkles size={18} />
            <span>AI Doubt Solver</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => { setActiveTab('library'); }}
          >
            <FileText size={18} />
            <span>Study Material</span>
          </div>

          {userRole === 'admin' && (
            <div 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin'); }}
            >
              <Settings size={18} />
              <span style={{ color: '#34d399', fontWeight: 'bold' }}>Faculty Portal</span>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {username ? username.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="user-info">
              <span className="user-name">{username || 'Student'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="user-role">{selectedGoal} Aspirant</span>
                {isPremiumUser && <Award size={12} style={{ color: '#fbbf24' }} />}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '16px', padding: '6px 12px', fontSize: '12px', gap: '6px' }}
            onClick={() => {
              localStorage.clear();
              setToken(null);
              setOnboarded(false);
              setUsername('');
              setUserEmail('');
              setIsPremiumUser(false);
              setUserRole('student');
              addToast('Logged out successfully.', 'info');
            }}
          >
            <LogOut size={12} /> Log Out
          </button>
        </div>
      </aside>
      )}

      
      {/* ==========================================
        MOBILE DRAWER (HAMBURGER MENU)
        ========================================== */}
      <div className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className="mobile-drawer-content">
          <div className="mobile-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src="/logo.jpg" alt="Jupitor Education" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Jupitor Education</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>v1.0</div>
              </div>
            </div>
          </div>
          
          <div className="mobile-drawer-body">
              {userRole === 'student' ? (
                <>
                  <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}>
                    <TrendingUp size={18} /><span>Dashboard</span>
                  </div>
                  <div className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`} onClick={() => { setActiveTab('lectures'); setIsMobileMenuOpen(false); }}>
                    <Play size={18} /><span>Video Lectures</span>
                  </div>
                  <div className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => { setActiveTab('quiz'); setIsMobileMenuOpen(false); }}>
                    <HelpCircle size={18} /><span>Practice & Tests</span>
                  </div>
                  <div className={`nav-item ${activeTab === 'doubt' ? 'active' : ''}`} onClick={() => { setActiveTab('doubt'); setIsMobileMenuOpen(false); }}>
                    <Sparkles size={18} /><span>AI Doubt Solver</span>
                  </div>
                  <div className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => { setActiveTab('library'); setIsMobileMenuOpen(false); }}>
                    <FileText size={18} /><span>Study Material</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}>
                    <TrendingUp size={18} /><span>Dashboard</span>
                  </div>
                  <div className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}>
                    <Settings size={18} /><span style={{ color: '#34d399', fontWeight: 'bold' }}>Faculty Admin Portal</span>
                  </div>
                </>
              )}
          </div>
          
          <div className="mobile-drawer-footer">
            <div className="user-badge" style={{ marginBottom: '16px' }}>
              <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="user-name">{username}</span>
                <span className="user-role">{userRole === 'admin' ? 'Administrator' : selectedGoal}</span>
              </div>
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                if (window.confirm('Are you sure you want to permanently delete your account? This will wipe all progress.')) {
                  localStorage.clear();
                  setToken(null);
                  setOnboarded(false);
                  setUsername('');
                  setUserEmail('');
                  setIsMobileMenuOpen(false);
                  addToast('Account deleted successfully.', 'success');
                }
              }}
            >
              <Trash2 size={16} /> Delete Account
            </button>
            
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                localStorage.clear();
                setToken(null);
                setOnboarded(false);
                setUsername('');
                setUserEmail('');
                setIsMobileMenuOpen(false);
                addToast('Logged out successfully.', 'info');
              }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      </div>
      
      {/* ==========================================
        MAIN APP CONTENT CONTAINER
        ========================================== */}

      <main className="main-content">
        {/* TOP HEADER */}
        <header className="top-navbar">
          <div className="header-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="mobile-hamburger" 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <Menu size={26} />
            </button>
            <h1>
              {activeTab === 'dashboard' && 'Academic Dashboard'}
              {activeTab === 'lectures' && 'Syllabus & Video Lectures'}
              {activeTab === 'quiz' && 'Interactive MCQ Practice Engine'}
              {activeTab === 'doubt' && 'Instant AI Pharmacological Solver'}
              {activeTab === 'library' && 'Reference Library & Revision Sheets'}
              {activeTab === 'admin' && 'Faculty Administration Portal'}
            </h1>
          </div>

          <div className="header-actions">
            <div 
              className="streak-pill"
              onClick={() => setShowMotivationOverlay(true)}
            >
              <Flame size={16} fill="currentColor" />
              <span>{streakDays} Day Streak</span>
            </div>

            <div className="streak-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)', color: 'var(--success)' }}>
              <Award size={16} />
              <span>{xpPoints} XP</span>
            </div>

            <div 
              className="goal-selector" 
              onClick={() => {
                if (userRole === 'admin') {
                  setShowGoalModal(true);
                } else {
                  addToast(`Your enrolled course (${selectedGoal}) is permanently locked. Contact administration support to change your target exam course.`, 'info');
                }
              }}
              style={{ 
                cursor: userRole === 'admin' ? 'pointer' : 'default',
                opacity: userRole === 'admin' ? 1 : 0.9,
                background: userRole === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: userRole === 'admin' ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span>Goal: <strong>{selectedGoal}</strong></span>
              {userRole === 'admin' ? (
                <ChevronRight size={14} />
              ) : (
                <Lock size={12} style={{ marginLeft: '6px', color: '#fbbf24' }} />
              )}
            </div>

            {!isPremiumUser ? (
              <button className="btn btn-primary" onClick={() => setShowSubscriptionModal(true)}>
                Upgrade Premium
              </button>
            ) : (
              <span className="badge badge-success" style={{ padding: '8px 12px' }}>
                ⭐ Jupitor Education Gold
              </span>
            )}
          </div>
        </header>

        {/* ==========================================
          DYNAMIC ROUTING CONTENT PAGES
          ========================================== */}
        <div className="content-container">
          
          {/* ==========================================
            TAB: DASHBOARD (HOME)
            ========================================== */}
          {activeTab === 'dashboard' && (
            <div className="fade-in-up">
              {/* Welcome Hero */}
              <div className="welcome-hero glass-card">
                <div className="welcome-hero-content">
                  <h2>Welcome Back, {username}!</h2>
                  <p>Your goal is set to <strong>{selectedGoal || 'General'}</strong>. You currently have {xpPoints} XP. Keep learning to grow your streak!</p>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('lectures')}>
                      {filteredLectures.length > 0 ? `Resume: ${filteredLectures[0].title}` : 'Browse Video Lectures'} <Play size={14} fill="currentColor" />
                    </button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('quiz')}>
                      Daily Practice Test <HelpCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Summary Rows */}
              <div className="grid-3 stats-row">
                <div className="stat-card glass-card">
                  <div className="stat-icon violet">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <div className="stat-number">{filteredLectures.length} Total</div>
                    <div className="stat-label">Syllabus Lectures Available</div>
                  </div>
                </div>

                <div className="stat-card glass-card">
                  <div className="stat-icon emerald">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div className="stat-number">{activeQuestions.length} Questions</div>
                    <div className="stat-label">Practice Question Bank</div>
                  </div>
                </div>

                <div className="stat-card glass-card">
                  <div className="stat-icon amber">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="stat-number">{filteredStudyMaterials.length} Documents</div>
                    <div className="stat-label">Pharma Monograph Notes</div>
                  </div>
                </div>
              </div>


              {/* Split layout: Batches & Leaderboard */}
              <div className="dashboard-content-split">
                
                {/* Left Side: Active Batches / Courses */}
                <div>
                  <div className="dashboard-section-title">
                    <h3>Your Enrolled Batches</h3>
                    <span className="see-all-link" onClick={() => addToast('More crash courses loading in v1.1!', 'info')}>View All</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="batch-card glass-card" style={{ padding: '36px', textAlign: 'center' }}>
                      <BookOpen size={32} style={{ margin: '0 auto 12px', color: 'var(--text-secondary)' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>No Enrolled Batches Yet</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Enroll in a course or check your class dashboard under active student subscriptions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Leaderboard */}
                <div>
                  <div className="dashboard-section-title">
                    <h3>Batch Leaderboard</h3>
                    <span className="see-all-link" onClick={() => addToast('Leaderboards refresh hourly.', 'info')}>Refresh</span>
                  </div>

                  <div className="glass-card" style={{ padding: '16px' }}>
                    <div className="leaderboard-list">
                      <div className="leaderboard-row highlight">
                        <div className="rank-circle">1</div>
                        <div className="leaderboard-row-name">You ({username || 'Student'})</div>
                        <div className="leaderboard-xp">{xpPoints} XP</div>
                      </div>
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        No other students in this batch yet.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
            TAB: LECTURES (VIDEO PLAYER)
            ========================================== */}
          {activeTab === 'lectures' && (
            <div className="fade-in-up">
              <div className="lecture-split">
                
                {/* Custom Video Player screen */}
                <div>
                  <div className="video-player-wrapper">
                    <div className="simulated-video">
                      <div className="video-watermark">{username} - {selectedGoal} Active Session</div>
                      
                      
                      <div className={`video-board ${isPlaying ? 'playing' : ''}`} style={{ padding: isPlaying ? '0' : '40px 20px' }}>
                        {!isPlaying ? (
                          <>
                            <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                              <BookOpen size={48} className="animate-pulse-slow" style={{ margin: '0 auto' }} />
                            </div>
                            <h3>{selectedLecture?.title || 'No Lectures Published'}</h3>
                            <p>{selectedLecture?.instructor || 'Faculty members can link new YouTube lectures inside the Faculty Portal.'}</p>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                              {!selectedLecture ? (
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Log in as Faculty to publish your first video lecture!</span>
                              ) : selectedLecture.isPremium && !isPremiumUser ? (
                                <button className="btn btn-primary" onClick={() => setShowSubscriptionModal(true)}>
                                  <Lock size={16} /> Unlock Premium Lecture
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-primary"
                                  onClick={() => {
                                    if (selectedLecture?.videoUrl && (selectedLecture.videoUrl.includes('youtube.com') || selectedLecture.videoUrl.includes('youtu.be'))) {
                                      setIsPlaying(true);
                                    } else {
                                      window.open(selectedLecture?.videoUrl || '#', '_blank');
                                    }
                                  }}
                                >
                                  {selectedLecture?.videoUrl && (selectedLecture.videoUrl.includes('youtube.com') || selectedLecture.videoUrl.includes('youtu.be')) ? '▶ Play Video' : '🔗 Open Link'}
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={
                                (() => {
                                  if (!selectedLecture?.videoUrl) return '';
                                  let url = selectedLecture.videoUrl;
                                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                  const match = url.match(regExp);
                                  if (match && match[2].length === 11) {
                                    return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
                                  }
                                  return url.includes('youtube.com/embed') ? url : url;
                                })()
                              }
                              title="YouTube video player" 
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                              allowFullScreen
                              style={{ borderRadius: '16px' }}
                            ></iframe>
                            <button 
                              onClick={() => setIsPlaying(false)} 
                              style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
                            >
                              Close Video ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Video Player controls HUD overlay */}
                      {selectedLecture && (!selectedLecture.isPremium || isPremiumUser) && (
                        <div className="video-overlay-controls">
                          <div 
                            className="video-progress-container"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = Math.round((clickX / rect.width) * 100);
                              setVideoProgress(percentage);
                            }}
                          >
                            <div className="video-progress-bar" style={{ width: `${videoProgress}%` }}></div>
                          </div>

                          <div className="video-controls-row">
                            <div className="video-left-controls">
                              <button className="video-control-btn" onClick={() => setIsPlaying(!isPlaying)}>
                                {isPlaying ? '⏸' : '▶'}
                              </button>
                              <div className="video-time">
                                {Math.floor((videoProgress / 100) * 45)}:00 / {selectedLecture?.duration || '00:00'}
                              </div>
                              <button 
                                className="video-control-btn" 
                                onClick={() => {
                                  addToast('Simulating offline video encryption and download...', 'info');
                                  setTimeout(() => addToast('Video downloaded! Available offline in your mobile app.', 'success'), 1500);
                                }}
                              >
                                <Download size={14} /> Download
                              </button>
                            </div>

                            <div className="video-right-controls">
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Speed: </label>
                              <select 
                                className="speed-select" 
                                value={playbackSpeed}
                                onChange={(e) => {
                                  setPlaybackSpeed(Number(e.target.value));
                                  addToast(`Speed changed to ${e.target.value}x`, 'success');
                                }}
                              >
                                <option value="0.5">0.5x</option>
                                <option value="1">1.0x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2.0x</option>
                              </select>
                              <button className="video-control-btn" onClick={() => addToast('Full screen simulated.', 'success')}>
                                <Maximize size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedLecture?.attachmentName && (
                    <div className="glass-card fade-in-up" style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)', borderColor: 'rgba(52, 211, 153, 0.25)', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>Syllabus Reference File</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedLecture.attachmentType || 'PDF Notes'} • {selectedLecture.attachmentSize || '2.4 MB'}</span>
                          </div>
                          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>📁 {selectedLecture.attachmentName}</h4>
                        </div>
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                          onClick={() => {
                            addToast(`Extracting local encrypted package: ${selectedLecture.attachmentName}...`, 'info');
                            setTimeout(() => addToast('Syllabus notes downloaded successfully!', 'success'), 1200);
                          }}
                        >
                          <Download size={14} /> Download Notes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabs: Notes & Monograph reference */}
                  <div className="glass-card" style={{ marginTop: '24px' }}>
                    <div className="lecture-tab-nav">
                      <button className="lecture-tab-btn active">Lecture Bookmarks & Notes</button>
                      <button className="lecture-tab-btn" onClick={() => addToast('Q&A board for this video will load in v1.1!', 'info')}>Student Q&A Board</button>
                    </div>

                    <div className="notes-list">
                      {videoNotes.map((n, idx) => (
                        <div key={idx} className="note-card">
                          <div className="note-header">
                            <span className="note-timestamp" onClick={() => setVideoProgress(idx === 0 ? 15 : 35)}>
                              ⏱ Timestamp: {n.timestamp} (Jump)
                            </span>
                            <span>Recorded by You</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{n.note}</p>
                        </div>
                      ))}

                      {/* Add new notes input */}
                      <form 
                        style={{ display: 'flex', gap: '8px', marginTop: '16px' }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newNoteText.trim()) return;
                          const mm = Math.floor(Math.random() * 40).toString().padStart(2, '0');
                          const ss = Math.floor(Math.random() * 59).toString().padStart(2, '0');
                          setVideoNotes([...videoNotes, { timestamp: `${mm}:${ss}`, note: newNoteText }]);
                          setNewNoteText('');
                          addToast('Added bookmark note!', 'success');
                        }}
                      >
                        <input 
                          type="text" 
                          placeholder="Type personal reference note..." 
                          className="form-input"
                          style={{ flexGrow: 1 }}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">Save Notes</button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Right Side: Subjects & Lecture Syllabus Playlists */}
                <div className="lecture-playlist-card glass-card">
                  <h3>Syllabus Chapters</h3>
                  
                  <div className="lecture-playlist-search">
                    <input 
                      type="text" 
                      placeholder="Search topics (e.g. tablet, ANS)..." 
                      className="form-input" 
                      style={{ paddingLeft: '36px' }}
                      value={lectureSearch}
                      onChange={(e) => setLectureSearch(e.target.value)}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                  </div>

                  <div className="lecture-playlist-items">
                    {filteredLectures
                      .filter(l => l.title.toLowerCase().includes(lectureSearch.toLowerCase()) || l.subject.toLowerCase().includes(lectureSearch.toLowerCase()))
                      .map((l) => (
                        <div 
                          key={l.id}
                          className={`playlist-item ${selectedLecture?.id === l.id ? 'active' : ''}`}
                          onClick={() => {
                            if (!isPremiumUser && !viewedLectureIds.includes(l.id)) {
                              if (viewedLectureIds.length >= 2) {
                                addToast('Free Tier Limit: Standard plan allows viewing only 2 syllabus lectures.', 'info');
                                setShowSubscriptionModal(true);
                                return;
                              }
                              setViewedLectureIds(prev => {
                                const next = [...prev, l.id];
                                localStorage.setItem('pharmiq_viewed_lec_ids', JSON.stringify(next));
                                return next;
                              });
                            }
                            setSelectedLecture(l);
                            setIsPlaying(false);
                            setVideoProgress(Math.floor(Math.random() * 40));
                          }}
                        >
                          <div className="playlist-item-icon">
                            {l.isPremium ? <Lock size={14} /> : <Play size={14} />}
                          </div>
                          
                          <div className="playlist-item-info">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                              <div className="playlist-item-title" style={{ flex: 1 }}>{l.title}</div>
                              {userRole === 'admin' && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '2px 6px', fontSize: '9.5px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', minWidth: 'fit-content' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdminDeleteLecture(l.id);
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <div className="playlist-item-meta">
                              <span className="badge badge-primary" style={{ padding: '1px 4px', fontSize: '9px' }}>{l.subject}</span>
                              <span>• {l.duration}</span>
                              <span>• {l.views} views</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
            TAB: PRACTICE & QUIZZES (EXAM ENGINE)
            ========================================== */}
          {activeTab === 'quiz' && (
            <div className="fade-in-up">
              {!quizFinished ? (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="quiz-header">
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
                        {activeQuestions[currentQuestionIndex]?.subject || 'Pharmacy'} MCQ
                      </span>
                      <h3>Daily Practice test: {selectedGoal} Pattern</h3>
                    </div>

                    <div className="quiz-timer">
                      <Clock size={16} />
                      <span>14:35 Remaining</span>
                    </div>
                  </div>

                  <div className="quiz-progress-bar-container">
                    <div 
                      className="quiz-progress-fill" 
                      style={{ width: `${((currentQuestionIndex + 1) / Math.max(1, activeQuestions.length)) * 100}%` }}
                    ></div>
                  </div>

                  <div className="quiz-question-card glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      <span>Question {currentQuestionIndex + 1} of {activeQuestions.length}</span>
                      <span>Single Correct Answer (+4 / -1 Scheme)</span>
                    </div>

                    <p className="question-text">
                      {activeQuestions[currentQuestionIndex]?.question || 'No questions available for this course pattern yet.'}
                    </p>

                    {activeQuestions[currentQuestionIndex] && (
                      <div className="options-list">
                        {activeQuestions[currentQuestionIndex]?.options.map((opt, idx) => {
                          let btnClass = '';
                          if (selectedOptionIndex === idx) {
                            btnClass = 'selected';
                          }
                          if (hasSubmittedAnswer) {
                            if (idx === activeQuestions[currentQuestionIndex].correctIndex) {
                              btnClass = 'correct';
                            } else if (selectedOptionIndex === idx) {
                              btnClass = 'wrong';
                            }
                          }

                          return (
                            <button 
                              key={idx}
                              className={`option-btn ${btnClass}`}
                              onClick={() => handleSelectOption(idx)}
                              disabled={hasSubmittedAnswer}
                            >
                              <div className="option-badge">
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {hasSubmittedAnswer && activeQuestions[currentQuestionIndex] && (
                      <div className="quiz-explanation-box">
                        <h4 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <CheckCircle size={16} /> Explanation:
                        </h4>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                          {activeQuestions[currentQuestionIndex]?.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="quiz-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => addToast('In real board exam, you can mark for review.', 'info')}
                    >
                      Mark for Review
                    </button>

                    {!hasSubmittedAnswer ? (
                      <button 
                        className="btn btn-primary"
                        onClick={handleSubmitAnswer}
                        disabled={selectedOptionIndex === null || !activeQuestions[currentQuestionIndex]}
                      >
                        Submit Answer <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button 
                        className="btn btn-success"
                        onClick={handleNextQuestion}
                      >
                        {currentQuestionIndex < activeQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* QUIZ COMPLETED STATS & REPORT */
                <div className="quiz-results-card glass-card">
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <Award size={64} style={{ color: '#f59e0b' }} />
                  </div>
                  
                  <h2>Practice Test Complete!</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                    Great job practicing! Consistent testing drives 85% higher retention for exams.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '32px' }}>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>
                        {quizScore} / {quizQuestions.length}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Questions Correct</div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {Math.round((quizScore / quizQuestions.length) * 100)}%
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Score Percentage</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--warning)' }}>
                        +{quizScore * 25}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>XP Gained</div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', textAlign: 'left', marginBottom: '32px' }}>
                    <h4 style={{ marginBottom: '12px' }}>Performance Analytics by Subject:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Pharmacology:</span>
                        <strong style={{ color: 'var(--success)' }}>100% Strength</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Pharmaceutics:</span>
                        <strong style={{ color: 'var(--success)' }}>100% Strength</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Pharmacognosy:</span>
                        <strong style={{ color: 'var(--warning)' }}>50% Needs Revision</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={handleResetQuiz}>
                      Try Again
                    </button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
            TAB: AI DOUBT ENGINE
            ========================================== */}
          {activeTab === 'doubt' && (
            <div className="fade-in-up">
              <div className="doubt-panel">
                
                {/* Active Chat panel */}
                <div className="doubt-chat-container">
                  <div className="doubt-chat-messages">
                    {chatHistory.map((chat, idx) => (
                      <div key={idx} className={`doubt-bubble ${chat.sender}`}>
                        <div className={`doubt-avatar ${chat.sender}`}>
                          {chat.sender === 'student' ? <User size={16} /> : <Sparkles size={16} />}
                        </div>
                        <div className="doubt-content">
                          {chat.image && <img src={chat.image} alt="Doubt Context" />}
                          <div style={{ whiteSpace: 'pre-line' }}>
                            {chat.text}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isAiThinking && (
                      <div className="doubt-bubble ai">
                        <div className="doubt-avatar ai">
                          <Sparkles size={16} />
                        </div>
                        <div className="doubt-content">
                          <div className="doubt-typing">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Pharmacologist is writing solution...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <form onSubmit={handleAskDoubt} className="doubt-input-area">
                    {doubtImage && (
                      <div className="doubt-image-preview">
                        <img src={doubtImage} alt="Thumbnail Preview" />
                        <button 
                          type="button" 
                          className="doubt-image-close"
                          onClick={() => setDoubtImage(null)}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}

                    <div className="doubt-input-row">
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '12px', flexShrink: 0 }}
                        onClick={handleSimulateCameraSnap}
                        title="Snap chemical formula picture"
                      >
                        <Camera size={18} />
                      </button>

                      <div className="doubt-input-box">
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Ask a doubt (e.g. tablet coatings, penicillin structure, bioavailability formulas)..."
                          value={doubtText}
                          onChange={(e) => setDoubtText(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', flexShrink: 0 }}>
                        Ask AI <Send size={14} />
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Side: Doubt History Board */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  <h3>Public Doubt Forum</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    See what pharmacy students are asking across India today.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {doubtList.map((d) => (
                      <div 
                        key={d.id} 
                        className="note-card" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setChatHistory(prev => [
                            ...prev,
                            { sender: 'student', text: d.question },
                            { sender: 'ai', text: d.answer }
                          ]);
                          addToast('Loaded doubt conversation!', 'success');
                        }}
                      >
                        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Q: {d.question}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>View Answer</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <span>{d.timestamp}</span>
                          <span>👍 {d.likes} approvals</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
            TAB: REFERENCE STUDY LIBRARY
            ========================================== */}
          {activeTab === 'library' && (
            <div className="fade-in-up">
              <div className="welcome-hero glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                <h2>Pharmacy Revision & References</h2>
                <p>Download structured PDF notes, drug classification charts, and pharmacopoeia references.</p>
              </div>

              <div className="grid-2" style={{ marginTop: '24px' }}>
                {filteredStudyMaterials.map((m) => (
                  <div key={m.id} className="material-card">
                    <div className="material-icon">
                      <FileText size={24} />
                    </div>

                    <div className="material-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '9px' }}>{m.subject}</span>
                        {m.isPremium && <span className="badge badge-warning" style={{ fontSize: '9px' }}>⭐ Gold Premium</span>}
                      </div>
                      <div className="material-title">{m.title}</div>
                      <div className="material-meta">Type: {m.type} | File size: {m.size}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`btn ${m.isPremium && !isPremiumUser ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => handleDownloadMaterial(m)}
                      >
                        {m.isPremium && !isPremiumUser ? <Lock size={14} /> : <Download size={14} />} Download
                      </button>

                      {userRole === 'admin' && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                          onClick={() => handleAdminDeleteMaterial(m.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==========================================
            TAB: FACULTY PANEL (MUTATE / ADMIN PORTAL)
            ========================================== */}
          {activeTab === 'admin' && userRole === 'admin' && (
            <div className="fade-in-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="admin-card glass-card" style={{ marginBottom: '24px' }}>
                <h2 className="admin-header-glow">👨‍🏫 Jupitor Education Faculty Control Console</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Simulate core administrative and educator actions. Injected data will dynamically appear immediately inside the respective dashboard screens!
                </p>

                <div>

                  {/* Form: Add Batch */}
                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Manage Academic Batches</h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input type="text" className="form-input" placeholder="New Batch (e.g. NIPER Achievers)" value={adminNewBatch} onChange={e => setAdminNewBatch(e.target.value)} />
                      <button className="btn btn-primary" onClick={handleAdminAddBatch}>Add</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {adminBatches.map(b => (
                        <span key={b.id} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}>
                          {b.name} <X size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => handleAdminDeleteBatch(b.id)} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Form: Add Subject */}
                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Manage Subjects</h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <select 
                        className="form-input" 
                        style={{ maxWidth: '200px' }}
                        value={adminNewSubjectBatchId} 
                        onChange={e => setAdminNewSubjectBatchId(e.target.value)}
                      >
                        <option value="">Select Batch...</option>
                        {adminBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <input type="text" className="form-input" placeholder="New Subject (e.g. Biochemistry)" value={adminNewSubject} onChange={e => setAdminNewSubject(e.target.value)} />
                      <button className="btn btn-primary" onClick={handleAdminAddSubject}>Add</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {adminSubjects.map(s => {
                        const batchName = adminBatches.find(b => b.id === s.batchId)?.name || 'Unknown';
                        return (
                          <span key={s.id} className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}>
                            {s.name} <span style={{ opacity: 0.6, fontSize: '9px' }}>({batchName})</span> <X size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => handleAdminDeleteSubject(s.id)} />
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form: Upload Lecture */}
                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Upload New Syllabus Lecture</h3>
                    <form onSubmit={handleAdminAddLecture} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Lecture Title</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="e.g. Mechanism of Sulfonamides"
                          value={adminLectureTitle}
                          onChange={(e) => setAdminLectureTitle(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Batch</label>
                          <select 
                            className="form-input"
                            value={adminLectureBatch}
                            onChange={(e) => setAdminLectureBatch(e.target.value)}
                          >
                            <option value="">Global (All)</option>
                            {adminBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Subject</label>
                          <select 
                            className="form-input"
                            value={adminLectureSubject}
                            onChange={(e) => setAdminLectureSubject(e.target.value)}
                          >
                            <option value="">Select Subject</option>
                            {adminSubjects
                              .filter(s => adminLectureBatch ? adminBatches.find(b => b.name === adminLectureBatch)?.id === s.batchId : true)
                              .map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                            }
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Duration</label>
                          <input 
                            type="text" 
                            className="form-input"
                            value={adminLectureDuration}
                            onChange={(e) => setAdminLectureDuration(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: '11.5px' }}>🔗 Content Type & Link</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            className="form-input" 
                            style={{ flex: '0 0 120px' }}
                            value={adminLectureType}
                            onChange={(e) => setAdminLectureType(e.target.value as 'youtube' | 'pdf')}
                          >
                            <option value="youtube">YouTube</option>
                            <option value="pdf">PDF Link</option>
                          </select>
                          <input 
                            type="url" 
                            className="form-input"
                            placeholder={adminLectureType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/notes.pdf'}
                            value={adminLectureUrl}
                            onChange={(e) => setAdminLectureUrl(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="premiumLec"
                          checked={adminLecturePremium}
                          onChange={(e) => setAdminLecturePremium(e.target.checked)}
                        />
                        <label htmlFor="premiumLec" style={{ fontSize: '13px' }}>Mark as Premium Gold Lecture</label>
                      </div>

                      <button type="submit" className="btn btn-success" style={{ marginTop: '8px' }} disabled={isUploading}>
                        <Plus size={14} /> {isUploading ? 'Uploading to Cloud...' : 'Inject Lecture'}
                      </button>
                    </form>
                  </div>

                </div>

                {/* Form: Inject Test Question */}
                <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Inject Practice MCQ Question</h3>
                  <form onSubmit={handleAdminAddQuestion} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Question Text</label>
                        <textarea 
                          className="form-input" 
                          style={{ height: '80px', fontSize: '13px' }}
                          placeholder="Which drug inhibits cell wall synthesis?"
                          value={adminQuestionText}
                          onChange={(e) => setAdminQuestionText(e.target.value)}
                          required
                        ></textarea>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Batch</label>
                          <select 
                            className="form-input"
                            value={adminQuestionBatch}
                            onChange={(e) => setAdminQuestionBatch(e.target.value)}
                          >
                            <option value="">Global (All)</option>
                            {adminBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Subject Tag</label>
                          <select 
                            className="form-input"
                            value={adminQuestionSubject}
                            onChange={(e) => setAdminQuestionSubject(e.target.value)}
                          >
                            <option value="">Select Subject</option>
                            {adminSubjects
                              .filter(s => adminQuestionBatch ? adminBatches.find(b => b.name === adminQuestionBatch)?.id === s.batchId : true)
                              .map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                            }
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Correct Option</label>
                          <select 
                            className="form-input"
                            value={adminQuestionCorrect}
                            onChange={(e) => setAdminQuestionCorrect(Number(e.target.value))}
                          >
                            <option value={0}>Option A</option>
                            <option value={1}>Option B</option>
                            <option value={2}>Option C</option>
                            <option value={3}>Option D</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Option A</label>
                          <input type="text" className="form-input" value={adminQuestionOptA} onChange={(e) => setAdminQuestionOptA(e.target.value)} placeholder="Option A" />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Option B</label>
                          <input type="text" className="form-input" value={adminQuestionOptB} onChange={(e) => setAdminQuestionOptB(e.target.value)} placeholder="Option B" />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Option C</label>
                          <input type="text" className="form-input" value={adminQuestionOptC} onChange={(e) => setAdminQuestionOptC(e.target.value)} placeholder="Option C" />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Option D</label>
                          <input type="text" className="form-input" value={adminQuestionOptD} onChange={(e) => setAdminQuestionOptD(e.target.value)} placeholder="Option D" />
                        </div>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Detailed Explanation</label>
                        <input type="text" className="form-input" value={adminQuestionExpl} onChange={(e) => setAdminQuestionExpl(e.target.value)} placeholder="Enter chemical mechanism explanations" />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                        <Plus size={14} /> Inject Test Question
                      </button>
                    </div>

                  </form>
                </div>

                {/* Section: Manage Uploaded Lectures */}
                <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    📺 Manage Uploaded Lectures
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {lectures.length === 0 ? (
                      <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>No lectures uploaded yet.</div>
                    ) : (
                      lectures.map(lec => (
                        <div key={lec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '14px', color: 'white' }}>{lec.title}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lec.subject} • {lec.duration}</span>
                          </div>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }} onClick={() => handleAdminDeleteLecture(lec.id)}>
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Section: Student Directory and Enrollment Management */}
                <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    👥 Enrolled Student Profiles & Course Management
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    View student details, trace their current goals, update their registered exam patterns, or toggle Gold Premium subscriptions.
                  </p>

                  {/* Dynamic Student Search Input */}
                  <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="🔍 Search student by name or email..." 
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="student-profile-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(() => {
                      const filtered = studentProfiles.filter(s => 
                        (s.username || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        (s.email || '').toLowerCase().includes(studentSearchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                            {studentProfiles.length === 0 ? 'No students are currently registered.' : 'No student profiles match your search criteria.'}
                          </div>
                        );
                      }
                      return filtered.map((student) => (
                        <div key={student.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="avatar-circle" style={{ width: '42px', height: '42px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                              {(student.username || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {student.username} 
                                <span className={`badge ${student.role === 'admin' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {student.role.toUpperCase()}
                                </span>
                              </h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                📧 {student.email} • 🔥 {student.streak} Days • ⭐ {student.xp} XP
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Course / Goal Selector */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Enrolled Goal Course</label>
                              <select 
                                className="form-input" 
                                style={{ padding: '6px 12px', fontSize: '12.5px', minWidth: '150px' }}
                                value={student.goal}
                                onChange={(e) => handleAdminUpdateUser(student.id, { goal: e.target.value })}
                              >
                                <option value="">Select Goal...</option>
                                {adminBatches.map(b => (
                                  <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Batch Selector */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Academic Batch</label>
                              <select 
                                className="form-input" 
                                style={{ padding: '6px 12px', fontSize: '12.5px', minWidth: '150px' }}
                                value={student.batch || ''}
                                onChange={(e) => handleAdminUpdateUser(student.id, { batch: e.target.value })}
                              >
                                <option value="">No Batch Assigned</option>
                                {adminBatches.map(b => (
                                  <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Premium Status */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subscription Plan</label>
                              <button 
                                className={`btn ${student.isPremiumUser ? 'btn-success' : 'btn-secondary'}`}
                                style={{ padding: '6px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => handleAdminUpdateUser(student.id, { isPremiumUser: !student.isPremiumUser })}
                              >
                                {student.isPremiumUser ? (
                                  <>⭐ Gold Premium</>
                                ) : (
                                  <>Standard Free</>
                                )}
                              </button>
                            </div>

                            {/* Delete User */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
                              <label style={{ fontSize: '11px', color: 'transparent' }}>Action</label>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '6px 16px', fontSize: '12.5px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                onClick={() => handleAdminDeleteUser(student.id)}
                              >
                                Delete User
                              </button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>



      {/* ==========================================
        SECURE SUBSCRIPTION MODAL (RAZORPAY GATEWAY)
        ========================================== */}
      {showSubscriptionModal && (
        <div className="pricing-modal">
          <div className="pricing-container">
            <button className="pricing-close-btn" onClick={() => setShowSubscriptionModal(false)}>
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Jupitor Education premium</span>
              <h2>Select Your Exam Success Plan</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Unlock all premium lectures, standard video downloads, test papers, and instant AI doubt answers.
              </p>
            </div>

            {/* Discount Coupon Code input */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto 24px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter Coupon (e.g. PHARMIQ50)" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">Apply</button>
            </form>

            <div className="pricing-grid">
              
              {/* Plan 1 */}
              <div className="pricing-card">
                <span className="pricing-card-title">Free Basic Tier</span>
                <div className="pricing-price">
                  <span className="pricing-amount">₹0</span>
                  <span className="pricing-duration"> / forever</span>
                </div>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={12} /> Limit 3 syllabus videos</li>
                  <li><CheckCircle size={12} /> Standard practice mock tests</li>
                  <li style={{ opacity: 0.5 }}><X size={12} style={{ color: 'var(--danger)' }} /> No offline downloads</li>
                  <li style={{ opacity: 0.5 }}><X size={12} style={{ color: 'var(--danger)' }} /> No AI instant doubts</li>
                </ul>
                <button className="btn btn-secondary" onClick={() => setShowSubscriptionModal(false)}>
                  Current Active Plan
                </button>
              </div>

              {/* Plan 2 */}
              <div className="pricing-card premium">
                <div className="pricing-badge">BEST VALUE</div>
                <span className="pricing-card-title">Jupitor Education Gold Pack</span>
                <div className="pricing-price">
                  <span className="pricing-amount">
                    ₹{appliedDiscount > 0 ? 1999 : 3999}
                  </span>
                  <span className="pricing-duration"> / 6 months</span>
                </div>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={12} /> Unlimited Video Lectures</li>
                  <li><CheckCircle size={12} /> Instant AI Doubt Solver (24/7)</li>
                  <li><CheckCircle size={12} /> Full length mock exams</li>
                  <li><CheckCircle size={12} /> Download PDFs and sheets</li>
                </ul>
                <button className="btn btn-primary" onClick={() => handlePaymentSubmit('Jupitor Education Gold Pack', 3999)}>
                  Upgrade Gold Now
                </button>
              </div>

              {/* Plan 3 */}
              <div className="pricing-card">
                <span className="pricing-card-title">NIPER Success Kit</span>
                <div className="pricing-price">
                  <span className="pricing-amount">
                    ₹{appliedDiscount > 0 ? 2999 : 5999}
                  </span>
                  <span className="pricing-duration"> / full course</span>
                </div>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={12} /> Complete NIPER JEE materials</li>
                  <li><CheckCircle size={12} /> Custom faculty study sessions</li>
                  <li><CheckCircle size={12} /> Advanced HPLC/IR monograph keys</li>
                  <li><CheckCircle size={12} /> 1:1 Live doubt clearances</li>
                </ul>
                <button className="btn btn-secondary" onClick={() => handlePaymentSubmit('NIPER Success Kit', 5999)}>
                  Get Success Kit
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
        STREAK MOTIVATIONAL POPUP
        ========================================== */}
      {showMotivationOverlay && (
        <div className="pricing-modal" onClick={() => setShowMotivationOverlay(false)}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
            <Flame size={64} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
            <h2>You have a {streakDays} Day Study Streak! 🔥</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px', fontSize: '14px', lineHeight: '1.6' }}>
              "Consistency is the key to mastering pharmacy. Students who maintain a 5+ day streak have an 88% higher exam passing rate."
            </p>
            <button className="btn btn-primary" onClick={() => setShowMotivationOverlay(false)}>
              Keep Crushing It!
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
        TOAST NOTIFICATIONS RENDERING
        ========================================== */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
