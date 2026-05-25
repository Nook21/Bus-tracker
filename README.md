# 🚌 Ethiopia Bus Tracking System

A real-time bus tracking platform for Ethiopia that enables passengers to track nearby buses live on a map, drivers to share GPS locations, and companies/admins to manage fleets.

## 🏗️ Architecture

```
bus-tracker/
├── client/          # React.js frontend
└── server/          # Node.js + Express backend
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account
- Gmail or SMTP credentials for Nodemailer

---

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

---

## 🔐 Environment Variables

### server/.env.example
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bus-tracker
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@email.com
MAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```

### client/.env.example
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 👥 Roles & Access

| Role      | Access                                              |
|-----------|-----------------------------------------------------|
| Admin     | Manage companies, view platform activity            |
| Company   | Manage drivers, buses, view live fleet              |
| Driver    | Start/end trips, share live GPS                     |
| Passenger | View nearby buses on map (no login required)        |

## 🗺️ Real-Time Flow

```
Driver Phone (GPS) → Socket.IO → Node.js Backend → MongoDB → Passenger React App
```

## 📦 Tech Stack

**Frontend:** React.js, React Router v6, Tailwind CSS, Leaflet.js, Socket.IO Client, Axios

**Backend:** Node.js, Express.js, MongoDB Atlas, Mongoose, Socket.IO, JWT, bcrypt, Nodemailer

## 🧪 Default Admin Credentials

Set via seed script or manually insert into MongoDB:
- Email: `admin@bustracker.et`
- Password: `Admin@1234`

## 📁 Project Structure

```
server/
├── config/         # DB connection, env config
├── controllers/    # Route handler logic
├── middleware/     # Auth, role guards, error handler
├── models/         # Mongoose schemas
├── routes/         # Express routers
├── socket/         # Socket.IO event handlers
├── services/       # Email, business logic
├── utils/          # Helpers, distance calc
├── app.js          # Express app setup
└── server.js       # Entry point

client/
├── src/
│   ├── api/        # Axios instances & API calls
│   ├── components/ # Reusable UI components
│   ├── context/    # Auth context, Socket context
│   ├── hooks/      # Custom React hooks
│   ├── pages/      # Route-level page components
│   ├── utils/      # Frontend helpers
│   └── main.jsx    # App entry
```
