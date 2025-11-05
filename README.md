# 🧠 Smart Flashcards Backend  
**Node.js + Express + MongoDB**

A backend service for an AI-powered flashcard system that automatically detects the **subject** of each flashcard from its question text — e.g., “photosynthesis” → *Biology*, “Newton’s Law” → *Physics*.  
Users can then retrieve a **mixed batch of flashcards** across subjects for smart revision.

---

## 🚀 Features
- **Automatic Subject Detection**  
  Rule-based keyword inference to classify flashcards into subjects like *Physics*, *Biology*, *Math*, etc.

- **Add Flashcards Easily**  
  `POST /flashcard` → adds a question & answer and auto-tags it with the inferred subject.

- **Smart Retrieval**  
  `GET /get-subject?student_id=stu001&limit=5` → returns up to 5 flashcards from **different subjects**, randomly mixed.

- **MongoDB Storage**  
  Persists student data and flashcards efficiently with indexing for performance.

- **Simple & Extendable Architecture**  
  Can easily be upgraded to use an ML model for subject classification.

---

## 🧩 Tech Stack
- **Node.js / Express** — REST API  
- **MongoDB / Mongoose** — Database  
- **dotenv** — Environment config  
- **Nodemon** — Development reloading  

---

## 📦 API Endpoints

### 1️⃣ Add Flashcard
**Endpoint:**  
`POST /flashcard`

**Request Body:**
```json
{
  "student_id": "stu001",
  "question": "What is Newton's Second Law?",
  "answer": "Force equals mass times acceleration"
}
```

**Response:**
```json
{
  "message": "Flashcard added successfully",
  "subject": "Physics"
}
```

---

### 2️⃣ Get Mixed Flashcards
**Endpoint:**  
`GET /get-subject?student_id=stu001&limit=5`

**Response:**
```json
[
  {
    "question": "What is Newton's Second Law?",
    "answer": "Force equals mass times acceleration",
    "subject": "Physics"
  },
  {
    "question": "What is photosynthesis?",
    "answer": "A process used by plants to convert light into energy",
    "subject": "Biology"
  }
]
```

---

## ⚙️ Setup

### 1. Clone and install dependencies
```bash
git clone https://github.com/<your-username>/smart-flashcards-backend.git
cd smart-flashcards-backend
npm install
```

### 2. Create a `.env` file
```
MONGO_URI=mongodb://localhost:27017/flashcards_db
PORT=3000
```

### 3. Run the server
```bash
npm run dev
```

Server will start at → [http://localhost:3000](http://localhost:3000)

---
