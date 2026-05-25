import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Play, 
  Video, 
  HelpCircle, 
  Download, 
  TrendingUp, 
  Flame, 
  Award, 
  LogOut, 
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
}

interface LiveSession {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  time: string;
  isLive: boolean;
  activeWatchers: number;
  slides: { title: string; content: string[] }[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject: string;
  goal?: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  type: string; // PDF, Chart, Monograph
  size: string;
  subject: string;
  isPremium: boolean;
  goal?: string;
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
const INITIAL_LIVE_SESSIONS: LiveSession[] = [];
const INITIAL_QUIZ: QuizQuestion[] = [];
const INITIAL_STUDY_MATERIALS: StudyMaterial[] = [];
const INITIAL_DOUBTS: DoubtItem[] = [];;

export default function App() {
  // ==========================================
  // CORE APP STATES
  // ==========================================
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('pharmiq_token') !== null;
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('pharmiq_username') || '';
  });
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    return localStorage.getItem('pharmiq_goal') || 'GPAT';
  });
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(() => {
    return localStorage.getItem('pharmiq_premium') === 'true';
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('pharmiq_role') || 'student';
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
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!token) {
      const initGoogle = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '107382218764-dummy.apps.googleusercontent.com',
            callback: handleGoogleAuthCallback,
          });
          
          const buttonElement = document.getElementById('google-signin-button');
          if (buttonElement) {
            (window as any).google.accounts.id.renderButton(buttonElement, {
              theme: 'dark',
              size: 'large',
              width: 320,
              type: 'standard',
              shape: 'pill'
            });
          }
        } else {
          setTimeout(initGoogle, 500);
        }
      };
      initGoogle();
    }
  }, [token, authMode]);

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

  const handleGoogleAuthCallback = async (response: any) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, goal: selectedGoal }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google login failed');
      }
      
      localStorage.setItem('pharmiq_token', data.token);
      localStorage.setItem('pharmiq_username', data.user.username);
      localStorage.setItem('pharmiq_goal', data.user.goal);
      localStorage.setItem('pharmiq_premium', data.user.isPremiumUser ? 'true' : 'false');
      localStorage.setItem('pharmiq_role', data.user.role || 'student');
      
      setToken(data.token);
      setUsername(data.user.username);
      setSelectedGoal(data.user.goal);
      setIsPremiumUser(data.user.isPremiumUser);
      setUserRole(data.user.role || 'student');
      setStreakDays(data.user.streakDays);
      setXpPoints(data.user.xpPoints);
      setOnboarded(true);

      addToast(`Welcome back, ${data.user.username}!`, 'success');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google Auth Connection Error. Please verify server.');
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
      ? { email: authEmail, password: authPassword, username, goal: selectedGoal }
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

      localStorage.setItem('pharmiq_token', data.token);
      localStorage.setItem('pharmiq_username', data.user.username);
      localStorage.setItem('pharmiq_goal', data.user.goal);
      localStorage.setItem('pharmiq_premium', data.user.isPremiumUser ? 'true' : 'false');
      localStorage.setItem('pharmiq_role', data.user.role || 'student');

      setToken(data.token);
      setUsername(data.user.username);
      setSelectedGoal(data.user.goal);
      setIsPremiumUser(data.user.isPremiumUser);
      setUserRole(data.user.role || 'student');
      setStreakDays(data.user.streakDays);
      setXpPoints(data.user.xpPoints);
      setOnboarded(true);

      addToast(authMode === 'signup' ? 'Account created successfully!' : 'Logged in successfully!', 'success');
    } catch (err: any) {
      console.error(err);
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
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(INITIAL_LIVE_SESSIONS);
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

  // ==========================================
  // LIVE STREAM INTERACTIVE STATES
  // ==========================================
  const [showLiveStreamView, setShowLiveStreamView] = useState<boolean>(false);
  const [activeLiveSession, setActiveLiveSession] = useState<LiveSession | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [streamComments, setStreamComments] = useState<{ id: string; user: string; text: string; role?: string }[]>([
    { id: 'c1', user: 'System Bot', text: 'Welcome to your live class. Chat is active!', role: 'System' }
  ]);
  const [newStreamComment, setNewStreamComment] = useState<string>('');
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; style: React.CSSProperties; emoji: string }[]>([]);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [remoteFrame, setRemoteFrame] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [studentProfiles, setStudentProfiles] = useState<{
    id: string;
    username: string;
    email: string;
    role: string;
    isPremiumUser: boolean;
    goal: string;
    xp: number;
    streak: number;
  }[]>([]);

  // ==========================================
  // FREE TIER RESTRICTION STATES
  // ==========================================
  const [viewedLectureIds, setViewedLectureIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('pharmiq_viewed_lec_ids') || '[]');
  });
  const [joinedStreamIds, setJoinedStreamIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('pharmiq_joined_stream_ids') || '[]');
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
  const [adminLectureFileName, setAdminLectureFileName] = useState<string>('');

  // ==========================================
  // WEBRTC REAL CAMERA BROADCASTING STATES
  // ==========================================
  const [liveStreamObj, setLiveStreamObj] = useState<MediaStream | null>(null);
  const [liveStreamDevices, setLiveStreamDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeVideoDevice, setActiveVideoDevice] = useState<string>('');
  const [isCameraMuted, setIsCameraMuted] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);

  const peerRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const [adminQuestionText, setAdminQuestionText] = useState<string>('');
  const [adminQuestionOptA, setAdminQuestionOptA] = useState<string>('');
  const [adminQuestionOptB, setAdminQuestionOptB] = useState<string>('');
  const [adminQuestionOptC, setAdminQuestionOptC] = useState<string>('');
  const [adminQuestionOptD, setAdminQuestionOptD] = useState<string>('');
  const [adminQuestionCorrect, setAdminQuestionCorrect] = useState<number>(0);
  const [adminQuestionExpl, setAdminQuestionExpl] = useState<string>('');
  const [adminQuestionSubject, setAdminQuestionSubject] = useState<string>('Pharmacology');

  const [adminLiveTitle, setAdminLiveTitle] = useState<string>('');
  const [adminLiveSubject, setAdminLiveSubject] = useState<string>('Pharmacology');
  const [adminLiveTeacher, setAdminLiveTeacher] = useState<string>('Dr. Ramesh Kumar');
  const [adminLiveSlides, setAdminLiveSlides] = useState<string>('Slide 1 Title:\n- Bullet point 1\n- Bullet point 2');

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
  const fetchLiveSessions = async () => {
    try {
      const res = await fetch(getApiUrl('/api/live-sessions'));
      if (res.ok) {
        const data = await res.json();
        setLiveSessions(data);
      }
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    }
  };

  // Real-time synchronization polling hook
  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic WebRTC Local/Remote Stream Media Renderer Hook
  useEffect(() => {
    if (liveVideoRef.current) {
      if (liveStreamObj) {
        liveVideoRef.current.srcObject = liveStreamObj;
        liveVideoRef.current.play().catch(err => {
          console.warn('Autoplay block triggered or camera device initializing:', err);
        });
      } else {
        liveVideoRef.current.srcObject = null;
      }
    }
  }, [liveStreamObj]);

  // Synchronized classroom live chat effect
  useEffect(() => {
    let interval: any;
    if (showLiveStreamView && activeLiveSession) {
      const fetchChats = () => {
        fetch(getApiUrl(`/api/live-sessions/${activeLiveSession.id}/chat`))
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setStreamComments(data.map(msg => ({
                id: msg.id,
                user: msg.sender,
                text: msg.text,
                role: msg.role === 'system' ? 'System' : msg.role === 'admin' ? 'Faculty' : undefined
              })));
            }
          })
          .catch(err => console.error('Error fetching live chat:', err));
      };

      fetchChats();
      interval = setInterval(fetchChats, 1500); // Poll chat every 1.5 seconds for extremely live responsiveness!
    }
    return () => clearInterval(interval);
  }, [showLiveStreamView, activeLiveSession]);

  // Synchronized classroom camera frame broadcaster / receiver loop
  useEffect(() => {
    let interval: any;
    if (showLiveStreamView && activeLiveSession) {
      if (userRole === 'admin') {
        // ADMIN BROADCASTER: Capture webcam frame and POST to backend
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 160;
        offscreenCanvas.height = 120;
        const ctx = offscreenCanvas.getContext('2d');

        interval = setInterval(() => {
          if (liveVideoRef.current && ctx && liveStreamObj && !isCameraMuted) {
            try {
              ctx.drawImage(liveVideoRef.current, 0, 0, 160, 120);
              const frame = offscreenCanvas.toDataURL('image/jpeg', 0.45);
              fetch(getApiUrl(`/api/live-sessions/${activeLiveSession.id}/frame`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frame })
              }).catch(() => {});
            } catch (e) {
              // Frame draw might fail before video starts
            }
          }
        }, 150); // Broadcaster frame rate: ~7 FPS (perfect balance of smoothness and zero network load)
      } else {
        // STUDENT RECEIVER: Poll latest frame from backend
        const fetchFrame = () => {
          fetch(getApiUrl(`/api/live-sessions/${activeLiveSession.id}/frame`))
            .then(res => res.json())
            .then(data => {
              if (data && data.frame) {
                setRemoteFrame(data.frame);
              }
            })
            .catch(() => {});
        };

        fetchFrame();
        interval = setInterval(fetchFrame, 150); // Polling frame rate: ~7 FPS (super smooth!)
      }
    } else {
      setRemoteFrame(null);
    }

    return () => clearInterval(interval);
  }, [showLiveStreamView, activeLiveSession, userRole, liveStreamObj, isCameraMuted]);

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

  // Reactive Sound Wave Dynamic Audio Analyser
  useEffect(() => {
    if (!liveStreamObj || isMicMuted) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaStreamAudioSourceNode;
    let animationFrameId: number;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(liveStreamObj);
      source.connect(analyser);

      analyser.fftSize = 32;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = document.getElementById('liveAudioCanvas') as HTMLCanvasElement;
      if (canvas) {
        const canvasCtx = canvas.getContext('2d');
        if (canvasCtx) {
          const draw = () => {
            animationFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.6)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              barHeight = (dataArray[i] / 255) * canvas.height * 0.95;

              // Vibrant green frequency bars
              canvasCtx.fillStyle = `rgb(52, 211, 153)`;
              canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 3, barHeight);

              x += barWidth;
            }
          };
          draw();
        }
      }
    } catch (e) {
      console.warn('AudioContext visualizer setup failed', e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext) audioContext.close();
    };
  }, [liveStreamObj, isMicMuted]);

  // Floating hearts simulation
  const triggerFloatingHeart = () => {
    const emojis = ['❤️', '🔥', '👏', '💡', '🎓', '💊'];
    const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const id = Date.now() + Math.random();
    const style: React.CSSProperties = {
      left: `${20 + Math.random() * 60}%`,
      animationDelay: '0s',
      fontSize: `${18 + Math.random() * 12}px`
    };
    
    setFloatingHearts(prev => [...prev, { id, style, emoji: selectedEmoji }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 3000);
  };

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

  // Simulated Razorpay payment flow
  const handlePaymentSubmit = (planName: string, amount: number) => {
    addToast('Opening Secured Razorpay Payment Gateway...', 'info');
    
    setTimeout(() => {
      const finalPrice = Math.round(amount * (1 - appliedDiscount));
      const payConfirm = window.confirm(`[Pharmiq Secured Payment Gateway]
      
Merchant: Pharmiq EdTech India
Plan: ${planName}
Amount to Pay: ₹${finalPrice} (Discount Applied: ${appliedDiscount * 100}%)
Payment Method: UPI / Razorpay Gateway Simulation

Click OK to confirm payment authorization.`);

      if (payConfirm) {
        setIsPremiumUser(true);
        setShowSubscriptionModal(false);
        addToast('Payment Successful! Welcome to Pharmiq Gold Premium!', 'success');
        setXpPoints(x => x + 200);
      } else {
        addToast('Payment cancelled by student.', 'info');
      }
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



  // ==========================================
  // WEBRTC NATIVE CAMERA AND BROADCAST STREAMING
  // ==========================================
  const startLiveWebcamStream = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      if (liveStreamObj) {
        liveStreamObj.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
      };

      addToast('Initializing webcam and media stream channels...', 'info');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLiveStreamObj(stream);
      (window as any).activeLiveStream = stream;

      // Enumerate hardware devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mediaDevices = devices.filter(d => d.kind === 'videoinput' || d.kind === 'audioinput');
      setLiveStreamDevices(mediaDevices);


      addToast('Real webcam live connection established successfully!', 'success');
    } catch (err: any) {
      console.error('Camera/Mic permission failed:', err);
      addToast('Could not access camera/mic. Running in simulated slides mode.', 'info');
    }
  };

  const stopLiveWebcamStream = () => {
    if (liveStreamObj) {
      liveStreamObj.getTracks().forEach(track => track.stop());
      setLiveStreamObj(null);
      (window as any).activeLiveStream = null;
      addToast('Webcam broadcast ended. Resources released.', 'info');
    }
  };

  const handleLeaveClassroom = () => {
    stopLiveWebcamStream();

    // End active WebRTC PeerJS call signaling connections
    try {
      if (activeCallRef.current) {
        activeCallRef.current.close();
        activeCallRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    } catch (e) {
      console.error('Error cleaning up WebRTC Peer connection:', e);
    }

    // Delete classroom backend record if the user is Admin
    if (userRole === 'admin' && activeLiveSession) {
      fetch(getApiUrl('/api/live-sessions/' + activeLiveSession.id), { method: 'DELETE' })
        .catch(err => console.error('Error ending live class:', err));
    }

    setShowLiveStreamView(false);
  };

  const handleToggleCamera = () => {
    if (liveStreamObj) {
      const videoTrack = liveStreamObj.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraMuted(!videoTrack.enabled);
        addToast(videoTrack.enabled ? 'Webcam active' : 'Webcam muted', 'success');
      }
    }
  };

  const handleToggleMic = () => {
    if (liveStreamObj) {
      const audioTrack = liveStreamObj.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
        addToast(audioTrack.enabled ? 'Microphone active' : 'Microphone muted', 'success');
      }
    }
  };

  const handleAdminAddLecture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLectureTitle) return;

    const newLec: VideoLecture = {
      id: `l_${Date.now()}`,
      title: adminLectureTitle,
      subject: adminLectureSubject,
      duration: adminLectureDuration,
      instructor: 'Guest Faculty Speaker',
      videoUrl: 'Custom dynamic lecture uploaded via Faculty Panel',
      views: '0',
      isPremium: adminLecturePremium,
      attachmentName: adminLectureFileName || undefined,
      attachmentSize: adminLectureFileName ? '2.4 MB' : undefined,
      attachmentType: adminLectureFileName ? 'PDF Revision Sheet' : undefined,
      goal: selectedGoal
    };

    setLectures(prev => [newLec, ...prev]);

    // POST to backend sync
    fetch(getApiUrl('/api/lectures'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLec)
    }).catch(err => console.error('Error syncing lecture:', err));

    // If PDF attachment is uploaded, also link it to Reference Library / Document Section
    if (adminLectureFileName) {
      const newMaterial: StudyMaterial = {
        id: `mat_${Date.now()}`,
        title: `${adminLectureTitle} Notes (${adminLectureFileName})`,
        type: 'PDF Notes',
        size: '2.4 MB',
        subject: adminLectureSubject,
        isPremium: adminLecturePremium,
        goal: selectedGoal
      };

      setStudyMaterials(prev => [newMaterial, ...prev]);

      fetch(getApiUrl('/api/materials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
      }).catch(err => console.error('Error syncing material:', err));
    }

    setAdminLectureTitle('');
    setAdminLectureFileName('');
    addToast('New Lecture with dynamic class syllabus notes injected!', 'success');
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
      goal: selectedGoal
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
    
    addToast('New GPAT Mock Question successfully injected!', 'success');
  };

  const handleAdminUpdateUser = (userId: string, updates: { goal?: string; isPremiumUser?: boolean }) => {
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

  const handleAdminSetLive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLiveTitle) return;

    // Parse slides
    const slideBlocks = adminLiveSlides.split('Slide').filter(s => s.trim());
    const parsedSlides = slideBlocks.map((block, idx) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      const title = lines[0] ? lines[0].replace(/^\d+\s*Title:\s*/, '').replace(/^Title:\s*/, '') : `Slide ${idx + 1}`;
      const content = lines.slice(1);
      return { title, content };
    });

    const newLive: LiveSession = {
      id: `live_${Date.now()}`,
      title: adminLiveTitle,
      subject: adminLiveSubject,
      instructor: adminLiveTeacher,
      time: 'Happening Now',
      isLive: true,
      activeWatchers: 50,
      slides: parsedSlides.length > 0 ? parsedSlides : [{ title: 'Overview', content: ['No slides uploaded.'] }]
    };

    // POST newly created live session to synchronization backend
    fetch(getApiUrl('/api/live-sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLive)
    }).then(res => {
      if (!res.ok) console.error('Failed to sync live session to backend');
    }).catch(err => console.error('Error syncing live session:', err));

    // Initialize WebRTC Broadcaster Peer
    try {
      if (peerRef.current) peerRef.current.destroy();
      
      const peerId = `pharmiq_${newLive.id}`;
      const peer = new (window as any).Peer(peerId);
      peerRef.current = peer;

      peer.on('open', (id: string) => {
        console.log('🚀 WebRTC Broadcast signaling established with ID:', id);
      });

      peer.on('call', (call: any) => {
        console.log('Incoming WebRTC viewer connected:', call.peer);
        const currentStream = (window as any).activeLiveStream;
        if (currentStream) {
          call.answer(currentStream);
          console.log('Answered student call with local camera feed!');
        } else {
          // If webcam has a small delay initializing, wait a little and answer
          setTimeout(() => {
            const retryStream = (window as any).activeLiveStream;
            if (retryStream) call.answer(retryStream);
          }, 1000);
        }
      });

      peer.on('error', (err: any) => {
        console.error('PeerJS Broadcaster Error:', err);
      });
    } catch (e) {
      console.error('Failed to start PeerJS Broadcaster:', e);
    }

    setLiveSessions(prev => [newLive, ...prev]);
    setAdminLiveTitle('');
    setActiveLiveSession(newLive);
    setShowLiveStreamView(true);
    startLiveWebcamStream();
    addToast(`"${adminLiveTitle}" is now broadcasted LIVE!`, 'success');
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

  // Simulated notes downloading
  const handleDownloadMaterial = (title: string, isPremium: boolean) => {
    if (isPremium && !isPremiumUser) {
      addToast('Upgrade to premium Gold tier to download this material.', 'info');
      setShowSubscriptionModal(true);
      return;
    }
    addToast(`Preparing "${title}" download files...`, 'info');
    setTimeout(() => {
      addToast(`Download Complete: ${title}`, 'success');
    }, 1200);
  };

  const activeQuestions = quizQuestions.filter(q => !q.goal || q.goal === selectedGoal);

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
              {['GPAT', 'NIPER', 'B.Pharm', 'D.Pharm', 'Drug Inspector', 'M.Pharm'].map((goal) => (
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
            <div className="onboarding-brand" style={{ marginBottom: '12px' }}>
              <BookOpen size={30} />
            </div>
            <h2 className="onboarding-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Welcome to Pharmiq</h2>
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

              {authMode === 'signup' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Target Goal</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['GPAT', 'NIPER', 'B.Pharm', 'D.Pharm', 'Drug Inspector', 'M.Pharm'].slice(0, 6).map((goal) => (
                      <div
                        key={goal}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: selectedGoal === goal ? 'var(--primary)' : 'var(--border-color)',
                          background: selectedGoal === goal ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          transition: 'var(--transition-smooth)'
                        }}
                        onClick={() => setSelectedGoal(goal)}
                      >
                        {goal}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              <div id="google-signin-button" style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>

              {/* Dynamic Google SSO Setup Guide */}
              <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                width: '100%',
                lineHeight: '1.5'
              }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚙️ Resolving Google Authorization Error (Error 401)
                </span>
                <span>
                  The <strong>invalid_client</strong> error occurs when Google receives a dummy/placeholder Client ID. To configure your own active credentials:
                </span>
                <ol style={{ paddingLeft: '16px', marginTop: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google Cloud Console</a>.</li>
                  <li>Create/Select your project and retrieve your <strong>OAuth 2.0 Client ID</strong>.</li>
                  <li>Paste it into the <code>.env</code> file in your project root folder:</li>
                </ol>
                <code style={{
                  display: 'block',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: 'white',
                  wordBreak: 'break-all',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                  VITE_GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
        SIDEBAR NAVIGATION PANEL
        ========================================== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <BookOpen size={20} />
          </div>
          <span className="logo-text">Pharmiq</span>
          <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>v1.0</span>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setShowLiveStreamView(false); }}
          >
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`}
            onClick={() => { setActiveTab('lectures'); setShowLiveStreamView(false); }}
          >
            <Play size={18} />
            <span>Video Lectures</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => { setActiveTab('live'); setShowLiveStreamView(false); }}
          >
            <Video size={18} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <span>Live Classes</span>
              <span className="live-dot" style={{ width: '6px', height: '6px' }}></span>
            </div>
          </div>

          <div 
            className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => { setActiveTab('quiz'); setShowLiveStreamView(false); }}
          >
            <HelpCircle size={18} />
            <span>Practice & Tests</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'doubt' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doubt'); setShowLiveStreamView(false); }}
          >
            <Sparkles size={18} />
            <span>AI Doubt Solver</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => { setActiveTab('library'); setShowLiveStreamView(false); }}
          >
            <FileText size={18} />
            <span>Study Material</span>
          </div>

          {userRole === 'admin' && (
            <div 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin'); setShowLiveStreamView(false); }}
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
              setIsPremiumUser(false);
              setUserRole('student');
              addToast('Logged out successfully.', 'info');
            }}
          >
            <LogOut size={12} /> Log Out
          </button>
        </div>
      </aside>

      {/* ==========================================
        MAIN APP CONTENT CONTAINER
        ========================================== */}
      <main className="main-content">
        {/* TOP HEADER */}
        <header className="top-navbar">
          <div className="header-title-section">
            <h1>
              {activeTab === 'dashboard' && 'Academic Dashboard'}
              {activeTab === 'lectures' && 'Syllabus & Video Lectures'}
              {activeTab === 'live' && 'Faculty Live Classrooms'}
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
                ⭐ Pharmiq Gold
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
                  <p>Your goal is set to <strong>{selectedGoal} Exam</strong>. Keep up the high score, 64% of today's target has been completed.</p>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('lectures')}>
                      Resume: Absorption Kinetics <Play size={14} fill="currentColor" />
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
                    <div className="stat-number">{lectures.length} Total</div>
                    <div className="stat-label">Syllabus Lectures Available</div>
                  </div>
                </div>

                <div className="stat-card glass-card">
                  <div className="stat-icon emerald">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div className="stat-number">{quizQuestions.length} Questions</div>
                    <div className="stat-label">GPAT Question Bank</div>
                  </div>
                </div>

                <div className="stat-card glass-card">
                  <div className="stat-icon amber">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="stat-number">{studyMaterials.length} Documents</div>
                    <div className="stat-label">Pharma Monograph Notes</div>
                  </div>
                </div>
              </div>

              {/* LIVE Class Alert Banner */}
              {liveSessions.some(s => s.isLive) && (
                <div className="live-class-alert glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="live-indicator">
                      <span className="live-dot"></span>
                      <span>BROADCASTING</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '2px' }}>
                        {liveSessions.find(s => s.isLive)?.title}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Instructor: {liveSessions.find(s => s.isLive)?.instructor} | {liveSessions.find(s => s.isLive)?.activeWatchers} students watching
                      </p>
                    </div>
                  </div>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => {
                      const activeSession = liveSessions.find(s => s.isLive) || liveSessions[0];
                      setActiveLiveSession(activeSession);
                      setActiveSlideIndex(0);
                      setShowLiveStreamView(true);
                    }}
                  >
                    Join Classroom <Video size={16} />
                  </button>
                </div>
              )}

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
                      
                      <div className={`video-board ${isPlaying ? 'playing' : ''}`}>
                        <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                          <BookOpen size={48} className="animate-pulse-slow" style={{ margin: '0 auto' }} />
                        </div>
                        <h3>{selectedLecture?.title || 'No Lectures Published'}</h3>
                        <p>{selectedLecture?.instructor || 'Faculty members can upload new lectures inside the Faculty Portal.'}</p>
                        
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
                                setIsPlaying(!isPlaying);
                                addToast(isPlaying ? 'Playback paused' : 'Simulating streaming lecture...', 'success');
                              }}
                            >
                              {isPlaying ? 'Pause Playback' : 'Start Streaming'}
                            </button>
                          )}
                        </div>
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
                    {lectures
                      .filter(l => !l.goal || l.goal === selectedGoal)
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
            TAB: LIVE STREAM INSTRUCTOR CLASSES
            ========================================== */}
          {activeTab === 'live' && (
            <div className="fade-in-up">
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="welcome-hero glass-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                  <h2>Live Faculty Interactive Classroom</h2>
                  <p>Connect immediately with top pharmacy professors, clear doubts, and solve boards in real time.</p>
                </div>

                <h3>Available Live & Scheduled Sessions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {liveSessions.map((session) => (
                    <div key={session.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {session.isLive ? (
                            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="live-dot" style={{ width: '6px', height: '6px', backgroundColor: 'white' }}></span> LIVE NOW
                            </span>
                          ) : (
                            <span className="badge badge-warning">SCHEDULED</span>
                          )}
                          <span className="badge badge-primary">{session.subject}</span>
                        </div>
                        <h4 style={{ fontSize: '18px', marginBottom: '4px' }}>{session.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Faculty Instructor: <strong>{session.instructor}</strong>
                        </p>
                      </div>

                      <div>
                        {session.isLive ? (
                          <button 
                            className="btn btn-danger"
                            onClick={() => {
                              if (!isPremiumUser && !joinedStreamIds.includes(session.id)) {
                                if (joinedStreamIds.length >= 1) {
                                  addToast('Free Tier Limit: Standard plan allows attending only 1 live stream classroom.', 'info');
                                  setShowSubscriptionModal(true);
                                  return;
                                }
                                setJoinedStreamIds(prev => {
                                  const next = [...prev, session.id];
                                  localStorage.setItem('pharmiq_joined_stream_ids', JSON.stringify(next));
                                  return next;
                                });
                              }
                              setActiveLiveSession(session);
                              setActiveSlideIndex(0);
                              setShowLiveStreamView(true);

                              // WebRTC P2P Receiver connection
                              try {
                                if (peerRef.current) peerRef.current.destroy();

                                const studentPeerId = `student_${Date.now()}`;
                                const peer = new (window as any).Peer(studentPeerId);
                                peerRef.current = peer;

                                peer.on('open', (id: string) => {
                                  console.log('📡 Student WebRTC Viewer active with Peer ID:', id);
                                  
                                  const adminPeerId = `pharmiq_${session.id}`;
                                  console.log('Initiating WebRTC stream request to Admin Peer:', adminPeerId);

                                  // Create lightweight dummy audio stream to establish connection
                                  let dummyStream: MediaStream;
                                  try {
                                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                    const oscillator = ctx.createOscillator();
                                    const dst = ctx.createMediaStreamDestination();
                                    oscillator.connect(dst);
                                    oscillator.start();
                                    dummyStream = dst.stream;
                                  } catch (e) {
                                    dummyStream = new MediaStream();
                                  }

                                  // Proactively dial admin
                                  const callAdminPeer = () => {
                                    const call = peer.call(adminPeerId, dummyStream);
                                    activeCallRef.current = call;

                                    call.on('stream', (remoteStream: MediaStream) => {
                                      console.log('🔥 WebRTC live video/audio stream received successfully!', remoteStream);
                                      setLiveStreamObj(remoteStream);
                                      

                                    });

                                    call.on('error', (err: any) => {
                                      console.error('WebRTC Peer call failed, retrying in 2 seconds...', err);
                                      setTimeout(callAdminPeer, 2000);
                                    });
                                  };

                                  // Start call with 1 second delay to ensure admin signaling is registered
                                  setTimeout(callAdminPeer, 1200);
                                });

                                peer.on('error', (err: any) => {
                                  console.error('Student PeerJS Error:', err);
                                });
                              } catch (e) {
                                console.error('WebRTC P2P initialization error:', e);
                              }

                              addToast('Connecting to Faculty WebRTC Live Stream Server...', 'info');
                            }}
                          >
                            Enter Classroom
                          </button>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{session.time}</span>
                            <button className="btn btn-secondary" onClick={() => addToast('SMS & Push notification reminder set!', 'success')}>
                              Set Reminder
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                    Great job practicing! Consistent testing drives 85% higher retention for GPAT.
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
                {studyMaterials
                  .filter(m => !m.goal || m.goal === selectedGoal)
                  .map((m) => (
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
                        onClick={() => handleDownloadMaterial(m.title, m.isPremium)}
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
                <h2 className="admin-header-glow">👨‍🏫 Pharmiq Faculty Control Console</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Simulate core administrative and educator actions. Injected data will dynamically appear immediately inside the respective dashboard screens!
                </p>

                <div className="grid-2">
                  
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
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Subject</label>
                          <select 
                            className="form-input"
                            value={adminLectureSubject}
                            onChange={(e) => setAdminLectureSubject(e.target.value)}
                          >
                            <option value="Pharmacology">Pharmacology</option>
                            <option value="Pharmaceutics">Pharmaceutics</option>
                            <option value="Medicinal Chemistry">Medicinal Chemistry</option>
                            <option value="Pharmacognosy">Pharmacognosy</option>
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
                        <label className="form-label" style={{ fontSize: '11.5px' }}>📁 Syllabus Notes / PDF Attachment File</label>
                        <input 
                          type="file" 
                          className="form-input"
                          style={{ padding: '6px', fontSize: '12px' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setAdminLectureFileName(e.target.files[0].name);
                              addToast(`Selected notes file: ${e.target.files[0].name}`, 'success');
                            }
                          }}
                        />
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

                      <button type="submit" className="btn btn-success" style={{ marginTop: '8px' }}>
                        <Plus size={14} /> Inject Lecture
                      </button>
                    </form>
                  </div>

                  {/* Form: Start Live Stream */}
                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Broadcast New Classroom LIVE</h3>
                    <form onSubmit={handleAdminSetLive} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Class Topic Title</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Dose Calculations Numericals"
                          value={adminLiveTitle}
                          onChange={(e) => setAdminLiveTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Subject</label>
                          <select 
                            className="form-input"
                            value={adminLiveSubject}
                            onChange={(e) => setAdminLiveSubject(e.target.value)}
                          >
                            <option value="Pharmacology">Pharmacology</option>
                            <option value="Pharmaceutics">Pharmaceutics</option>
                            <option value="Pharmaceutical Analysis">Analysis</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Faculty</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={adminLiveTeacher}
                            onChange={(e) => setAdminLiveTeacher(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Live Slides (Bullet format)</label>
                        <textarea 
                          className="form-input" 
                          style={{ height: '80px', fontSize: '12px', fontFamily: 'monospace' }}
                          value={adminLiveSlides}
                          onChange={(e) => setAdminLiveSlides(e.target.value)}
                        ></textarea>
                      </div>

                      <button type="submit" className="btn btn-danger">
                        <Video size={14} /> Go Live Instantly
                      </button>
                    </form>
                  </div>

                </div>

                {/* Form: Inject Test Question */}
                <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Inject GPAT Practice MCQ Question</h3>
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
                          <label className="form-label" style={{ fontSize: '11px' }}>Subject Tag</label>
                          <select 
                            className="form-input"
                            value={adminQuestionSubject}
                            onChange={(e) => setAdminQuestionSubject(e.target.value)}
                          >
                            <option value="Pharmacology">Pharmacology</option>
                            <option value="Pharmaceutics">Pharmaceutics</option>
                            <option value="Pharmacognosy">Pharmacognosy</option>
                            <option value="Jurisprudence">Jurisprudence</option>
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

                {/* Section: Student Directory and Enrollment Management */}
                <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    👥 Enrolled Student Profiles & Course Management
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    View student details, trace their current goals, update their registered exam patterns, or toggle Gold Premium subscriptions.
                  </p>

                  <div className="student-profile-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {studentProfiles.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No students are currently registered on this database node.
                      </div>
                    ) : (
                      studentProfiles.map((student) => (
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
                                <option value="GPAT">GPAT Exam</option>
                                <option value="NIPER">NIPER Board</option>
                                <option value="Drug Inspector">Drug Inspector</option>
                                <option value="Pharmacist Board">Government Pharmacist</option>
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
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==========================================
        REAL-TIME CHAT & LIVE STREAM OVERLAY
        ========================================== */}
      {showLiveStreamView && activeLiveSession && (
        <div className="live-stream-overlay">
          
          {/* Left Area: Facecam & Active Board Presentation */}
          <div className="live-stream-left">
            <div className="live-badge-red">
              <span className="live-dot" style={{ backgroundColor: 'white' }}></span>
              <span>LIVE</span>
            </div>

            <div className="live-stream-header">
              <div className="live-views-badge">
                <User size={14} />
                <span>1.4k Watching</span>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)' }}
                onClick={handleLeaveClassroom}
              >
                <X size={16} />
              </button>
            </div>

            <div className="live-stream-video-container">
              <div className="live-stream-video">
                
                {/* Simulated Presentation Slides */}
                {activeLiveSession.slides.length > 0 ? (
                  <div className="live-slides-view">
                    <h2>{activeLiveSession.slides[activeSlideIndex]?.title}</h2>
                    <div className="live-slides-content">
                      {activeLiveSession.slides[activeSlideIndex]?.content.map((line, idx) => (
                        <p key={idx} style={{ fontSize: '15px', color: 'white', marginBottom: '8px', textAlign: 'left' }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Sparkles size={48} className="animate-pulse-slow" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
                    <h3>Classroom Setup Complete</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Instructor is initiating webcam and slide streams...</p>
                  </div>
                )}

                {/* Simulated Floating Emojis */}
                <div className="floating-hearts-container">
                  {floatingHearts.map((heart) => (
                    <div key={heart.id} className="floating-heart" style={heart.style}>
                      {heart.emoji}
                    </div>
                  ))}
                </div>

                {/* Facecam Picture-in-Picture */}
                <div className="live-instructor-facecam" style={{ width: '220px', height: '165px', overflow: 'hidden', position: 'absolute', bottom: '24px', right: '24px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }}>
                  {userRole === 'admin' ? (
                    liveStreamObj && !isCameraMuted ? (
                      <video 
                        ref={liveVideoRef}
                        autoPlay 
                        playsInline 
                        muted={true}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)',
                          background: '#040710'
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: '#111827', color: 'var(--text-secondary)' }}>
                        <Video size={24} style={{ marginBottom: '4px', opacity: 0.5 }} />
                        <span style={{ fontSize: '10px' }}>Camera Paused</span>
                      </div>
                    )
                  ) : (
                    /* Student Viewer Side: Premium Live Video stream fallback / real receiver */
                    remoteFrame ? (
                      <img 
                        src={remoteFrame}
                        alt="Instructor Facecam"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)', // Mirror image to look like a webcam
                          background: '#040710'
                        }}
                      />
                    ) : (
                      /* Premium glassmorphic fallback visualizer card */
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%', 
                        width: '100%', 
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', 
                        color: 'white',
                        position: 'relative'
                      }}>
                        {/* Pulsing visualizer circle */}
                        <div className="animate-ping" style={{ 
                          position: 'absolute', 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '50%', 
                          background: 'rgba(52, 211, 153, 0.15)',
                          animationDuration: '2s'
                        }}></div>
                        
                        {/* High-res Professional Faculty Avatar */}
                        <div style={{ 
                          width: '64px', 
                          height: '64px', 
                          borderRadius: '50%', 
                          border: '2px solid var(--success)', 
                          boxShadow: '0 0 15px rgba(52, 211, 153, 0.4)',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          zIndex: 2,
                          marginBottom: '8px'
                        }}>
                          👨‍🏫
                        </div>
                        
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)', zIndex: 2 }}>Broadcasting Live</span>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', zIndex: 2 }}>Secure WebRTC P2P Feed</span>
                      </div>
                    )
                  )}
                  
                  <div className="live-instructor-badge" style={{ position: 'absolute', bottom: '6px', left: '6px', margin: 0, zIndex: 10 }}>
                    🎥 {activeLiveSession.instructor}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom classroom controls */}
            <div className="live-stream-bottom-bar">
              <div className="live-controls-left">
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{activeLiveSession.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subject: {activeLiveSession.subject}</span>
              </div>

              <div className="live-controls-center" style={{ gap: '12px' }}>
                {/* Dynamic voice analyser Canvas */}
                {liveStreamObj && !isMicMuted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--success)' }}>Mic Feed:</span>
                    <canvas id="liveAudioCanvas" width="50" height="18" style={{ borderRadius: '3px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}></canvas>
                  </div>
                )}

                {/* Webcam Controls */}
                {userRole === 'admin' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className={`btn ${isCameraMuted ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={handleToggleCamera}
                      title="Toggle Camera On/Off"
                    >
                      {isCameraMuted ? '🎥 Unmute Cam' : '🎥 Mute Cam'}
                    </button>
                    <button 
                      className={`btn ${isMicMuted ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={handleToggleMic}
                      title="Toggle Mic On/Off"
                    >
                      {isMicMuted ? '🎤 Unmute Mic' : '🎤 Mute Mic'}
                    </button>
                  </div>
                )}

                {/* Device Selector Dropdowns */}
                {userRole === 'admin' && liveStreamDevices.filter(d => d.kind === 'videoinput').length > 0 && (
                  <select 
                    className="speed-select"
                    style={{ maxWidth: '130px', fontSize: '11px', height: '30px' }}
                    value={activeVideoDevice}
                    onChange={(e) => {
                      setActiveVideoDevice(e.target.value);
                      startLiveWebcamStream(e.target.value);
                    }}
                  >
                    {liveStreamDevices.filter(d => d.kind === 'videoinput').map(dev => (
                      <option key={dev.deviceId} value={dev.deviceId}>{dev.label || `Camera ${dev.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                )}

                <button 
                  className={`btn ${isHandRaised ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => {
                    setIsHandRaised(!isHandRaised);
                    addToast(isHandRaised ? 'Lowered hand.' : 'You raised your hand! Faculty notified.', 'success');
                  }}
                >
                  🖐️ {isHandRaised ? 'Hand Raised' : 'Raise Hand'}
                </button>

                <button className="btn btn-secondary" onClick={triggerFloatingHeart}>
                  💖 React
                </button>

                {activeLiveSession.slides.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary"
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex(prev => prev - 1)}
                    >
                      Prev
                    </button>
                    <button 
                      className="btn btn-secondary"
                      disabled={activeSlideIndex === activeLiveSession.slides.length - 1}
                      onClick={() => setActiveSlideIndex(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-danger" 
                onClick={handleLeaveClassroom}
              >
                Leave Classroom
              </button>
            </div>
          </div>

          {/* Right Area: Interactive Q&A chat thread */}
          <div className="live-stream-right">
            <div className="live-chat-header">
              <h3>Live Interactive Chat</h3>
              <span className="badge badge-success">Online</span>
            </div>

            <div className="live-chat-messages">
              {streamComments.map((msg) => (
                <div key={msg.id} className="live-chat-msg">
                  <div className="chat-msg-user">
                    <span style={{ 
                      color: msg.role === 'Faculty' ? '#ec4899' : msg.role === 'System' ? '#34d399' : '#3b82f6' 
                    }}>
                      {msg.user}
                    </span>
                    {msg.role && (
                      <span className="badge badge-primary" style={{ fontSize: '8px', padding: '1px 4px' }}>
                        {msg.role}
                      </span>
                    )}
                  </div>
                  <div className="chat-msg-text">{msg.text}</div>
                </div>
              ))}
            </div>

            {/* Send chat */}
            <form 
              className="live-chat-input-area"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newStreamComment.trim() || !activeLiveSession) return;
                
                const body = {
                  sender: userRole === 'admin' ? 'Dr. Ramesh Kumar' : username || 'Student',
                  text: newStreamComment,
                  role: userRole === 'admin' ? 'admin' : 'student'
                };

                fetch(getApiUrl(`/api/live-sessions/${activeLiveSession.id}/chat`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                }).catch(err => console.error('Error sending message:', err));

                setNewStreamComment('');
                triggerFloatingHeart();
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ask public question in class..."
                  value={newStreamComment}
                  onChange={(e) => setNewStreamComment(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

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
              <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Pharmiq premium</span>
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
                <span className="pricing-card-title">Pharmiq Gold Pack</span>
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
                <button className="btn btn-primary" onClick={() => handlePaymentSubmit('Pharmiq Gold Pack', 3999)}>
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
              "Consistency is the key to mastering pharmacy. Students who maintain a 5+ day streak have an 88% higher GPAT passing rate."
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
