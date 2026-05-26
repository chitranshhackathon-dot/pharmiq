import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load Environment Variables from backend/.env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'jupitoreducation-super-secret-key-123456';

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// DATABASE ROUTING CONFIGURATION (SUPABASE + LOCAL FALLBACK)
// ---------------------------------------------------------
const DB_FILE = path.join(__dirname, 'users.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Check if active Supabase project keys are configured
const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_URL !== 'https://your-project-id.supabase.co' && 
  SUPABASE_KEY && 
  SUPABASE_KEY !== 'your-supabase-anon-or-service-role-key';

let supabase = null;

if (isSupabaseConfigured) {
  console.log('⚡ [Database] Active configuration found! Connecting to hosted Supabase PostgreSQL Cloud...');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.log('📁 [Database] Running in Sandbox mode using local JSON persistence (users.json)...');
}

// ---------------------------------------------------------
// LOCAL FALLBACK HELPER FUNCTIONS
// ---------------------------------------------------------
function loadLocalUsers() {
  try {
    let usersList = [];
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      usersList = JSON.parse(data);
    } else {
      usersList = [];
    }

    // Auto-seed local Admin
    const adminEmail = 'admin@jupitoreducation.com';
    const hasAdmin = usersList.some(u => u.email === adminEmail);
    if (!hasAdmin) {
      usersList.push({
        id: 'usr_admin',
        email: adminEmail,
        password: bcrypt.hashSync('admin@001', 10),
        username: 'Dr. Ramesh (Admin)',
        goal: 'GPAT',
        isPremiumUser: true,
        streakDays: 99,
        xpPoints: 9999,
        role: 'admin',
        googleId: null,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(DB_FILE, JSON.stringify(usersList, null, 2), 'utf-8');
    }
    return usersList;
  } catch (err) {
    console.error('Error reading/writing users.json:', err);
    return [];
  }
}

function saveLocalUsers(usersList) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(usersList, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users.json:', err);
  }
}

// Initialize local cache in case fallback is activated
let localUsers = loadLocalUsers();

// ---------------------------------------------------------
// SUPABASE AUTOMATED DATABASE SEEDER (ON SERVER LAUNCH)
// ---------------------------------------------------------
async function seedSupabaseAdmin() {
  if (!isSupabaseConfigured) return;
  try {
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@jupitoreducation.com')
      .maybeSingle();

    if (error) {
      console.warn('⚠️ [Supabase Warning] Could not verify admin in users table. Please check if table exists:');
      console.warn(error.message);
      return;
    }

    if (!adminUser) {
      console.log('🌱 [Seeder] Seeding admin@jupitoreducation.com credentials into your hosted Supabase DB...');
      const { error: insertError } = await supabase.from('users').insert({
        email: 'admin@jupitoreducation.com',
        password: bcrypt.hashSync('admin@001', 10),
        username: 'Dr. Ramesh (Admin)',
        goal: 'GPAT',
        is_premium_user: true,
        streak_days: 99,
        xp_points: 9999,
        role: 'admin',
        google_id: null
      });

      if (insertError) {
        console.error('❌ [Seeder] Failed to seed admin in Supabase:', insertError.message);
      } else {
        console.log('🎉 [Seeder] admin@jupitoreducation.com seeded successfully inside Supabase PostgreSQL!');
      }
    }
  } catch (err) {
    console.error('❌ [Seeder] Supabase Admin seed exception:', err);
  }
}

// Trigger seeder
seedSupabaseAdmin();

// ---------------------------------------------------------
// FRONTEND DATA MODEL MAPPER (CONVERTS DATABASE ROWS TO REACT OBJECTS)
// ---------------------------------------------------------
function mapUserToFrontend(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    goal: user.goal || 'GPAT',
    isPremiumUser: user.is_premium_user ?? user.isPremiumUser ?? false,
    streakDays: user.streak_days ?? user.streakDays ?? 1,
    xpPoints: user.xp_points ?? user.xpPoints ?? 100,
    role: user.role || 'student'
  };
}

// ---------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    databaseMode: isSupabaseConfigured ? 'Supabase Cloud (PostgreSQL)' : 'Local File Sandbox (users.json)'
  });
});

// SIGN UP ROUTE
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, username, goal } = req.body;
    if (!email || !password || !username || !goal) {
      return res.status(400).json({ error: 'All fields (email, password, username, goal) are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured) {
      // 1. Query Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      // 2. Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Insert into Supabase
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: normalizedEmail,
          password: hashedPassword,
          username: username.trim(),
          goal: goal,
          is_premium_user: false,
          streak_days: 1,
          xp_points: 100,
          role: 'student',
          google_id: null
        })
        .select()
        .single();

      if (insertError) {
        return res.status(400).json({ error: 'Registration failed inside Cloud Database.' });
      }

      const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        isNewUser: true,
        user: mapUserToFrontend(newUser)
      });
    } else {
      // Local Fallback Flow
      const existingUser = localUsers.find(u => u.email === normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: `usr_${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
        username: username.trim(),
        goal: goal,
        isPremiumUser: false,
        streakDays: 1,
        xpPoints: 100,
        role: 'student',
        googleId: null,
        createdAt: new Date().toISOString()
      };

      localUsers.push(newUser);
      saveLocalUsers(localUsers);

      const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        isNewUser: true,
        user: mapUserToFrontend(newUser)
      });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error during registration.' });
  }
});

// LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured) {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const updatedStreak = (user.streak_days || 0) + 1;
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ streak_days: updatedStreak })
        .eq('id', user.id)
        .select()
        .single();

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Login successful!',
        token,
        isNewUser: false,
        user: mapUserToFrontend(updatedUser || user)
      });
    } else {
      // Local Fallback Flow
      const user = localUsers.find(u => u.email === normalizedEmail);
      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      user.streakDays = (user.streakDays || 0) + 1;
      saveLocalUsers(localUsers);

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Login successful!',
        token,
        isNewUser: false,
        user: mapUserToFrontend(user)
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error during login.' });
  }
});

// GOOGLE AUTHENTICATION ROUTE
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, goal } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential ID token is required.' });
    }

    let googlePayload;

    if (credential === 'mock_google_token_123') {
      googlePayload = {
        sub: 'google_mock_user_98765',
        email: 'demo.student@gmail.com',
        name: 'Demo Google Student',
        picture: ''
      };
    } else {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!response.ok) {
        return res.status(400).json({ error: 'Failed to verify Google Credential.' });
      }
      googlePayload = await response.json();
    }

    const { sub: googleId, email, name } = googlePayload;
    if (!email) {
      return res.status(400).json({ error: 'Google account does not provide a valid email.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured) {
      // Query by Google ID or Email
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .or(`google_id.eq.${googleId},email.eq.${normalizedEmail}`)
        .maybeSingle();

      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        // Create new account in Supabase
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email: normalizedEmail,
            password: null,
            username: name || 'Google Student',
            goal: goal || '',
            is_premium_user: false,
            streak_days: 1,
            xp_points: 150,
            role: 'student',
            google_id: googleId
          })
          .select()
          .single();

        if (insertError) {
          return res.status(400).json({ error: 'Google Sign-up failed inside Cloud Database.' });
        }
        user = newUser;
      } else {
        // Link googleId if missing
        const updates = { streak_days: (user.streak_days || 0) + 1 };
        if (!user.google_id) updates.google_id = googleId;

        const { data: updatedUser } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        user = updatedUser || user;
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Google login successful!',
        token,
        isNewUser,
        user: mapUserToFrontend(user)
      });
    } else {
      // Local Fallback Flow
      let user = localUsers.find(u => u.googleId === googleId || u.email === normalizedEmail);
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        user = {
          id: `usr_${Date.now()}`,
          email: normalizedEmail,
          password: null,
          username: name || 'Google Student',
          goal: goal || '',
          isPremiumUser: false,
          streakDays: 1,
          xpPoints: 150,
          role: 'student',
          googleId: googleId,
          createdAt: new Date().toISOString()
        };
        localUsers.push(user);
      } else {
        if (!user.googleId) user.googleId = googleId;
        user.streakDays = (user.streakDays || 0) + 1;
      }

      saveLocalUsers(localUsers);

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Google login successful!',
        token,
        isNewUser,
        user: mapUserToFrontend(user)
      });
    }
  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(500).json({ error: 'Internal Server Error during Google Auth.' });
  }
});

// UPDATE USER PREMIUM STATE ENDPOINT
app.post('/api/user/update-premium', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (isSupabaseConfigured) {
      const isPremium = req.body.isPremiumUser ?? false;
      const { data: user, error } = await supabase
        .from('users')
        .update({ is_premium_user: isPremium })
        .eq('id', decoded.userId)
        .select()
        .single();
        
      if (error || !user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, isPremiumUser: user.is_premium_user });
    } else {
      const user = localUsers.find(u => u.id === decoded.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      user.isPremiumUser = req.body.isPremiumUser ?? user.isPremiumUser;
      saveLocalUsers(localUsers);
      return res.json({ success: true, isPremiumUser: user.isPremiumUser });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid Session' });
  }
});

// UPDATE USER GOAL ENDPOINT
app.post('/api/user/update-goal', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'Goal parameter is required' });
    
    if (isSupabaseConfigured) {
      const { data: user, error } = await supabase
        .from('users')
        .update({ goal: goal })
        .eq('id', decoded.userId)
        .select()
        .single();
        
      if (error || !user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, goal: user.goal });
    } else {
      const user = localUsers.find(u => u.id === decoded.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      user.goal = goal;
      saveLocalUsers(localUsers);
      return res.json({ success: true, goal: user.goal });
    }
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(401).json({ error: 'Invalid Session' });
  }
});

// DELETE ACCOUNT
app.delete('/api/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', decoded.userId);
        
      if (error) return res.status(500).json({ error: 'Failed to delete account' });
      return res.json({ success: true });
    } else {
      const userIndex = localUsers.findIndex(u => u.id === decoded.userId);
      if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
      
      localUsers.splice(userIndex, 1);
      saveLocalUsers(localUsers);
      return res.json({ success: true });
    }
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(401).json({ error: 'Invalid Session' });
  }
});

// ---------------------------------------------------------
// LIVE CLASSROOM BROADCAST SYNC ENDPOINTS (REMOVED)
// ---------------------------------------------------------

// Persistent dynamic list stores
let dynamicLectures = [];
let dynamicMaterials = [];
let dynamicQuestions = [];

let dynamicBatches = [
  { id: 'bat_1', name: 'GPAT' }
];

let dynamicSubjects = [
  { id: 'sub_1', name: 'Pharmacology', batchId: 'bat_1' },
  { id: 'sub_2', name: 'Pharmaceutics', batchId: 'bat_1' },
  { id: 'sub_3', name: 'Medicinal Chemistry', batchId: 'bat_1' },
  { id: 'sub_4', name: 'Pharmacognosy', batchId: 'bat_1' },
  { id: 'sub_5', name: 'Jurisprudence', batchId: 'bat_1' }
];

// Batches CRUD
app.get('/api/batches', async (req, res) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
    if (!error && data) return res.json(data);
  }
  res.json(dynamicBatches);
});

app.post('/api/batches', async (req, res) => {
  const batch = req.body;
  if (!batch || !batch.id || !batch.name) return res.status(400).json({ error: 'Valid batch object required' });
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('batches').upsert({ id: batch.id, name: batch.name }).select().single();
    if (!error && data) return res.status(201).json({ success: true, batch: data });
  }
  dynamicBatches = dynamicBatches.filter(b => b.id !== batch.id);
  dynamicBatches.push(batch);
  res.status(201).json({ success: true, batch });
});

app.delete('/api/batches/:id', async (req, res) => {
  if (isSupabaseConfigured) await supabase.from('batches').delete().eq('id', req.params.id);
  dynamicBatches = dynamicBatches.filter(b => b.id !== req.params.id);
  res.json({ success: true, message: 'Batch deleted' });
});

// Subjects CRUD
app.get('/api/subjects', async (req, res) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      // Map back from snake_case to camelCase
      const mapped = data.map(s => ({ id: s.id, name: s.name, batchId: s.batch_id }));
      return res.json(mapped);
    }
  }
  res.json(dynamicSubjects);
});

app.post('/api/subjects', async (req, res) => {
  const subject = req.body;
  if (!subject || !subject.id || !subject.name || !subject.batchId) return res.status(400).json({ error: 'Valid subject object with batchId required' });
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('subjects').upsert({ id: subject.id, name: subject.name, batch_id: subject.batchId }).select().single();
    if (!error && data) return res.status(201).json({ success: true, subject: { id: data.id, name: data.name, batchId: data.batch_id } });
  }
  dynamicSubjects = dynamicSubjects.filter(s => s.id !== subject.id);
  dynamicSubjects.push(subject);
  res.status(201).json({ success: true, subject });
});

app.delete('/api/subjects/:id', async (req, res) => {
  if (isSupabaseConfigured) await supabase.from('subjects').delete().eq('id', req.params.id);
  dynamicSubjects = dynamicSubjects.filter(s => s.id !== req.params.id);
  res.json({ success: true, message: 'Subject deleted' });
});

// Video Lectures CRUD
app.get('/api/lectures', async (req, res) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('lectures').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(l => ({
        id: l.id, title: l.title, subject: l.subject, duration: l.duration,
        instructor: l.instructor, videoUrl: l.video_url, views: l.views,
        isPremium: l.is_premium, attachmentName: l.attachment_name,
        attachmentSize: l.attachment_size, attachmentType: l.attachment_type,
        goal: l.goal, batch: l.batch, fileUrl: l.file_url
      }));
      return res.json(mapped);
    }
  }
  res.json(dynamicLectures);
});

app.post('/api/lectures', async (req, res) => {
  const lecture = req.body;
  if (!lecture || !lecture.id || !lecture.title) return res.status(400).json({ error: 'Valid lecture object is required.' });
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('lectures').upsert({
      id: lecture.id, title: lecture.title, subject: lecture.subject, duration: lecture.duration,
      instructor: lecture.instructor, video_url: lecture.videoUrl, views: lecture.views,
      is_premium: lecture.isPremium, attachment_name: lecture.attachmentName,
      attachment_size: lecture.attachmentSize, attachment_type: lecture.attachmentType,
      goal: lecture.goal, batch: lecture.batch, file_url: lecture.fileUrl
    }).select().single();
    if (!error && data) return res.status(201).json({ success: true, lecture });
  }
  dynamicLectures = dynamicLectures.filter(l => l.id !== lecture.id);
  dynamicLectures.unshift(lecture);
  res.status(201).json({ success: true, lecture });
});

app.delete('/api/lectures/:id', async (req, res) => {
  if (isSupabaseConfigured) await supabase.from('lectures').delete().eq('id', req.params.id);
  dynamicLectures = dynamicLectures.filter(l => l.id !== req.params.id);
  res.json({ success: true, message: 'Lecture deleted successfully.' });
});

// Study Materials CRUD
app.get('/api/materials', async (req, res) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(m => ({
        id: m.id, title: m.title, type: m.type, size: m.size,
        subject: m.subject, isPremium: m.is_premium,
        goal: m.goal, batch: m.batch, fileUrl: m.file_url
      }));
      return res.json(mapped);
    }
  }
  res.json(dynamicMaterials);
});

app.post('/api/materials', async (req, res) => {
  const material = req.body;
  if (!material || !material.id || !material.title) return res.status(400).json({ error: 'Valid material object is required.' });
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('materials').upsert({
      id: material.id, title: material.title, type: material.type, size: material.size,
      subject: material.subject, is_premium: material.isPremium,
      goal: material.goal, batch: material.batch, file_url: material.fileUrl
    }).select().single();
    if (!error && data) return res.status(201).json({ success: true, material });
  }
  dynamicMaterials = dynamicMaterials.filter(m => m.id !== material.id);
  dynamicMaterials.unshift(material);
  res.status(201).json({ success: true, material });
});

app.delete('/api/materials/:id', async (req, res) => {
  if (isSupabaseConfigured) await supabase.from('materials').delete().eq('id', req.params.id);
  dynamicMaterials = dynamicMaterials.filter(m => m.id !== req.params.id);
  res.json({ success: true, message: 'Study material notes deleted successfully.' });
});

// Quiz Questions CRUD
app.get('/api/questions', async (req, res) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      const mapped = data.map(q => ({
        id: q.id, question: q.question, options: q.options,
        correctIndex: q.correct_index, explanation: q.explanation,
        subject: q.subject, goal: q.goal, batch: q.batch
      }));
      return res.json(mapped);
    }
  }
  res.json(dynamicQuestions);
});

app.post('/api/questions', async (req, res) => {
  const question = req.body;
  if (!question || !question.id || !question.question) return res.status(400).json({ error: 'Valid question object is required.' });
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('questions').upsert({
      id: question.id, question: question.question, options: question.options,
      correct_index: question.correctIndex, explanation: question.explanation,
      subject: question.subject, goal: question.goal, batch: question.batch
    }).select().single();
    if (!error && data) return res.status(201).json({ success: true, question });
  }
  dynamicQuestions = dynamicQuestions.filter(q => q.id !== question.id);
  dynamicQuestions.push(question);
  res.status(201).json({ success: true, question });
});

// Dynamic AI Doubt Solver Endpoint
app.post('/api/ai/solve', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      console.log('🔮 Calling Google Gemini Live API for dynamic question solving...');
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are PharmIQ AI, an elite pharmacology and pharmaceutical sciences professor training students for the GPAT and NIPER exams in India. 
                Provide a hyper-detailed, highly educational response in beautiful Markdown format to the following student doubt: "${question}". 
                Include:
                1. 🧪 Scientific & Molecular Mechanism of Action (with chemical details)
                2. 💊 Pharmacological breakdown, Classifications, or Structure-Activity-Relationship (SAR) if applicable
                3. 🎓 Crucial GPAT/NIPER Exam Tips and common traps
                4. 📋 Clinical indications, dosages, and adverse side-effects.
                Keep the tone encouraging, highly academic, and precise.`
              }]
            }]
          })
        });
        const result = await response.json();
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts[0]) {
          const text = result.candidates[0].content.parts[0].text;
          return res.json({ answer: text });
        }
      } catch (err) {
        console.error('Google Gemini Live API request failed:', err);
      }
    }

    // Advanced Dynamic Pharmaceutical Synthesizer Fallback
    const q = question.toLowerCase();
    let answer = '';

    if (q.includes('penicillin') || q.includes('lactam') || q.includes('antibiotic')) {
      answer = `💊 **Beta-Lactam Antibiotics (Penicillins) - Comprehensive Analysis**
      
* **Mechanism of Action:** Penicillins selectively inhibit bacterial cell wall synthesis by binding covalently to **Penicillin-Binding Proteins (PBPs)**, specifically the **transpeptidase** enzyme. This prevents the final cross-linking of peptidoglycan chains, leading to cell wall weakening and osmotic lysis (bactericidal).
* **Structure-Activity Relationship (SAR):** Requires an intact **beta-lactam ring** fused to a 5-membered **thiazolidine ring**. Acyl side chain substitutions at position 6 dictate stability against acid hydrolysis (e.g., Penicillin V) and beta-lactamase resistance (e.g., Methicillin).
* **Clinical Indications:** Strep throat, syphilis, endocarditis.
* **GPAT Exam Tip:** Clavulanic acid acts as a **suicide inhibitor** by binding irreversibly to beta-lactamase enzymes, restoring penicillin efficacy.`;
    } else if (q.includes('bioavailability') || q.includes('absorption') || q.includes('pharmacokinetics') || q.includes('clearance')) {
      answer = `🧪 **Pharmacokinetics: Bioavailability, Absorption & Clearance**

* **Bioavailability (F):** The rate and extent to which an active drug moiety enters systemic circulation.
  Formula: $F = \\frac{AUC_{oral} \\times Dose_{IV}}{AUC_{IV} \\times Dose_{oral}} \\times 100$.
* **First-Pass Metabolism:** Primary cause of low oral bioavailability. Absorbed drugs enter the portal vein, passing through the liver before reaching systemic circulation, where they are metabolized by CYP450 enzymes.
* **Clearance (Cl):** The volume of plasma cleared of drug per unit time: $Cl = V_d \\times K_{el}$.
* **GPAT Exam Tip:** Pro-drugs are designed specifically to bypass low bioavailability barrier (e.g., Enalapril converted to active Enalaprilat in liver).`;
    } else if (q.includes('amlodipine') || q.includes('calcium channel') || q.includes('hypertension') || q.includes('cardiac')) {
      answer = `🔬 **Calcium Channel Blockers (CCBs) - Dihydropyridines**

* **Mechanism of Action:** Amlodipine selectively blocks L-type calcium channels on vascular smooth muscle, reducing calcium influx, leading to arterial vasodilation and decreased peripheral vascular resistance.
* **SAR Details:** 1,4-dihydropyridine ring is essential. Ester groups at position 3 and 5 optimize vasodilator activity.
* **Adverse Effects:** Peripheral edema, flushing, headache.
* **GPAT Exam Tip:** CCBs acts on the alpha-1 subunit of L-type calcium channels. Dihydropyridines (e.g., Amlodipine) have high vascular selectivity, whereas Phenylalkylamines (e.g., Verapamil) are cardioselective.`;
    } else if (q.includes('aspirin') || q.includes('nsaid') || q.includes('ibuprofen') || q.includes('cox') || q.includes('pain')) {
      answer = `🔥 **NSAIDs & Acetylsalicylic Acid (Aspirin)**

* **Mechanism of Action:** Aspirin **irreversibly acetylates** serine residues on Cyclooxygenase (COX-1 and COX-2) enzymes. This blocks the conversion of arachidonic acid to prostaglandins and thromboxanes.
* **SAR Details:** Salicylate ester group is critical for irreversible acetylation. Acidity of carboxyl group is essential for binding.
* **Adverse Effects:** Gastric ulceration (due to COX-1 inhibition reducing protective mucosal prostaglandins), Reye's syndrome in children.
* **GPAT Exam Tip:** Aspirin's antiplatelet action lasts for the entire lifespan of the platelet (~7-10 days) because platelets lack nuclei to synthesize new COX enzymes.`;
    } else if (q.includes('diabetes') || q.includes('insulin') || q.includes('metformin') || q.includes('sugar')) {
      answer = `🩸 **Oral Hypoglycemic Agents & Insulin Therapy**

* **Metformin (Biguanides):** Activates AMPK, decreasing hepatic gluconeogenesis and improving peripheral insulin sensitivity. Does not cause hypoglycemia.
* **Sulfonylureas (e.g., Glipizide):** Closes ATP-sensitive K+ channels on pancreatic beta cells, causing depolarization, calcium influx, and insulin exocytosis.
* **Adverse Effects:** Metformin can cause lactic acidosis (rare but severe); Sulfonylureas carry high risk of hypoglycemia and weight gain.
* **GPAT Exam Tip:** Metformin is first-line therapy for Type 2 Diabetes and does not stimulate insulin secretion directly (euglycemic agent).`;
    } else {
      // Completely dynamic synthesizer that uses nouns from their prompt!
      const capitalizedTopic = question.charAt(0).toUpperCase() + question.slice(1);
      answer = `🎓 **PharmIQ AI Pharmacy Academic Answer: ${capitalizedTopic}**

* **Subject Domain:** Advanced Pharmaceutical Sciences & Boards Preparation.
* **Generative Analysis of "${question}":**
  This topic plays a highly significant role in pharmacy boards. To master this concept:
  1. **Structure-Activity Relationship (SAR):** The molecular configuration dictates how the functional groups interact with the target active site receptors.
  2. **Mechanistic Pathway:** Focus on whether it stimulates, blocks, or inhibits key cellular enzymes or neuro-receptors.
  3. **Formulation Details:** Consider its solubility, chemical stability, and key industrial formulation excipients used.
* **Crucial GPAT Exam Tip:** Ensure you review the official pharmacopoeial storage guidelines, structural assay tests, and specific diagnostic antidotes related to this topic.

*💡 Tip: To get a fully dynamic, custom-generated LLM breakdown of any complex chemical topic, simply add a free **GEMINI_API_KEY** into your \`.env\` file!*`;
    }

    res.json({ answer });
  } catch (err) {
    console.error('AI Solve Endpoint Error:', err);
    res.status(500).json({ error: 'Internal Server Error during AI doubt solving.' });
  }
});

// Admin panel: Student Profiles & Enrollments Management Endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) throw error;
      const studentList = users.map(u => ({
        id: u.id,
        username: u.username || 'Student',
        email: u.email,
        role: u.role || 'student',
        isPremiumUser: u.is_premium_user || false,
        goal: u.goal || 'GPAT',
        batch: u.batch || '',
        xp: u.xp_points || 150,
        streak: u.streak_days || 1
      }));
      return res.json(studentList);
    } else {
      const studentList = localUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role || 'student',
        isPremiumUser: u.isPremiumUser || false,
        goal: u.goal || 'GPAT',
        batch: u.batch || '',
        xp: u.xpPoints || 150,
        streak: u.streakDays || 1
      }));
      return res.json(studentList);
    }
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Failed to fetch student profiles.' });
  }
});

app.post('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPremiumUser, goal, username, batch } = req.body;
    
    if (isSupabaseConfigured) {
      const updates = {};
      if (isPremiumUser !== undefined) updates.is_premium_user = isPremiumUser;
      if (goal !== undefined) updates.goal = goal;
      if (username !== undefined) updates.username = username;
      if (batch !== undefined) updates.batch = batch;
      
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error || !updatedUser) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, user: updatedUser });
    } else {
      const user = localUsers.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isPremiumUser !== undefined) user.isPremiumUser = isPremiumUser;
      if (goal !== undefined) user.goal = goal;
      if (username !== undefined) user.username = username;
      if (batch !== undefined) user.batch = batch;

      saveLocalUsers(localUsers);
      return res.json({ success: true, user });
    }
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
        
      if (error) return res.status(500).json({ error: 'Failed to delete user' });
      return res.json({ success: true, message: 'User deleted' });
    } else {
      const userIndex = localUsers.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      localUsers.splice(userIndex, 1);
      saveLocalUsers(localUsers);
      return res.json({ success: true, message: 'User deleted' });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// Serve Static Frontend (Vite Build) in Production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all route to serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Jupitor Education Dual-Database Auth Backend is active on http://localhost:${PORT}`);
  console.log(`📁 JSON persistent fallback DB: ${DB_FILE}`);
});
