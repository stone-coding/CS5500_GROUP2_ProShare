# ProShare – AI-Powered Article Platform

ProShare is a full-stack web application that allows users to create, search, and interact with articles, enhanced with AI-powered summarization.

## 🚀 Live Demo
- Frontend: https://cs-5500-group-2-pro-share.vercel.app
- Backend API: https://proshare-backend-xxix.onrender.com/docs

---

## 🧠 Features

### 🔐 Authentication
- User registration & login (JWT-based)
- Secure API access with token authentication

### 📝 Article System
- Create, update, delete articles
- Search articles by title/content
- Pagination support

### ⭐ Social Interaction
- Bookmark articles
- View personal bookmarks

### 🤖 AI Integration
- Generate article summaries using LLM
- Regenerate summaries on demand
- Caching mechanism to reduce repeated API calls

---

## 🏗️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Axios / Fetch API
- Deployed on Vercel

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL (Neon)
- JWT Authentication
- OpenAI API (LLM integration)
- Deployed on Render

---

## ⚙️ Architecture


Frontend (React)
↓
REST API (FastAPI)
↓
PostgreSQL (Neon DB)
↓
OpenAI API (LLM)


---

## 🧪 Local Development

### Backend

```bash
cd proshare-backend
pip install -r requirements.txt
uvicorn main:app --reload
Frontend
cd proshare-frontend
npm install
npm run dev

🔧 Environment Variables
Backend (.env)
DATABASE_URL=your_database_url
OPENAI_API_KEY=your_openai_key
SECRET_KEY=your_secret
Frontend (.env.local)
VITE_API_BASE_URL=https://proshare-backend-xxix.onrender.com

🐛 Known Issues
Render free tier may cause cold start delays (~30–60s)
Requires proper CORS configuration for production frontend

📌 Future Improvements
Like system
Comment threading
Real-time updates (WebSocket)
Role-based access control
AI-powered recommendations
