require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Flashcard = require('./models/Flashcard');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Please set MONGO_URI in .env');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });

/**
 * SUBJECT INFERENCE (rule-based)
 * - We use keyword lists per subject.
 * - Count keyword hits and pick the subject with max matches.
 * - If no match, fallback to "General".
 */
const SUBJECT_KEYWORDS = {
  Physics: ["force","acceleration","energy","gravity","law","motion","mass","velocity","inertia","momentum","speed","newton"],
  Biology: ["cell","photosynthesis","organism","plant","animal","dna","enzyme","mitosis","ecology","evolution","photosynthesis"],
  Chemistry: ["atom","molecule","reaction","acid","base","compound","element","periodic","ph","stoichiometry","bond"],
  Mathematics: ["equation","theorem","algebra","geometry","integration","derivative","calculus","matrix","probability","statistics"],
  History: ["war","empire","king","revolution","ancient","civilization","treaty","colony","timeline"],
  ComputerScience: ["algorithm","data structure","complexity","array","tree","graph","hash","database","sql","api","thread","concurrency"]
};

function inferSubject(text) {
  if (!text || !text.trim()) return "General";

  const t = text.toLowerCase();
  const scores = {};

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    let count = 0;
    for (const kw of keywords) {
      // word boundary check to reduce false positives (e.g., "mass" in "massive")
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'i');
      if (re.test(t)) count++;
    }
    if (count > 0) scores[subject] = count;
  }

  // Choose subject with highest score
  const entries = Object.entries(scores);
  if (entries.length === 0) return "General";

  entries.sort((a,b) => b[1] - a[1]); // descending
  return entries[0][0];
}

/**
 * POST /flashcard
 * Body: { student_id, question, answer }
 * Returns: { message, subject }
 */
app.post('/flashcard', async (req, res) => {
  try {
    const { student_id, question, answer } = req.body;
    if (!student_id || !question || !answer) {
      return res.status(400).json({ error: 'student_id, question and answer are required' });
    }

    const subject = inferSubject(question);

    const doc = new Flashcard({ student_id, question, answer, subject });
    await doc.save();

    return res.json({ message: 'Flashcard added successfully', subject });
  } catch (err) {
    console.error('POST /flashcard error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Utility: Fisher-Yates shuffle
 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * GET /get-subject?student_id=stu001&limit=5
 * Behavior:
 *  - Only cards for that student
 *  - Prefer cards from different subjects (one per subject first)
 *  - Shuffle to mix subjects
 *  - Return up to limit cards
 */
app.get('/get-subject', async (req, res) => {
  try {
    const student_id = String(req.query.student_id || '').trim();
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '5'))); // bounds

    if (!student_id) return res.status(400).json({ error: 'student_id is required as query param' });

    // fetch all flashcards for the student (could be optimized with pagination if large)
    const cards = await Flashcard.find({ student_id }).lean();

    if (!cards || cards.length === 0) return res.json([]);

    // group by subject
    const bySubject = {};
    for (const c of cards) {
      const s = c.subject || 'General';
      if (!bySubject[s]) bySubject[s] = [];
      bySubject[s].push(c);
    }

    // shuffle each subject bucket
    for (const key of Object.keys(bySubject)) {
      shuffleInPlace(bySubject[key]);
    }

    const subjects = Object.keys(bySubject);
    shuffleInPlace(subjects); // random subject order

    const result = [];
    const takenIds = new Set();

    // 1) Try to pick ONE per subject (round-robin over shuffled subject list)
    for (let i = 0; i < subjects.length && result.length < limit; i++) {
      const s = subjects[i];
      const arr = bySubject[s];
      if (arr && arr.length > 0) {
        const cand = arr.shift(); // take one
        if (cand && !takenIds.has(String(cand._id))) {
          takenIds.add(String(cand._id));
          result.push({
            question: cand.question,
            answer: cand.answer,
            subject: cand.subject
          });
        }
      }
    }

    // 2) If still need more (limit not reached), fill from remaining cards across subjects
    if (result.length < limit) {
      // collect remaining cards
      const remaining = [];
      for (const arr of Object.values(bySubject)) {
        for (const c of arr) if (!takenIds.has(String(c._id))) remaining.push(c);
      }
      shuffleInPlace(remaining);
      for (const c of remaining) {
        if (result.length >= limit) break;
        takenIds.add(String(c._id));
        result.push({ question: c.question, answer: c.answer, subject: c.subject });
      }
    }

    // final shuffle to mix subjects (small shuffle)
    shuffleInPlace(result);

    return res.json(result);
  } catch (err) {
    console.error('GET /get-subject error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
