# Smart Contract & Invoice Intelligence Engine

An AI-powered full-stack SaaS platform that helps freelancers, consultants, agencies, and small service businesses manage contracts, milestones, invoices, and payments from a single workspace.

The platform converts uploaded **PDF/DOCX contracts into structured business information**, uses AI to analyze contract risks and generate summaries, and provides tools for milestone tracking, invoice management, payment tracking, contract Q&A, and payment reminder generation.

---

## 🚀 Problem

Freelancers and small businesses often manage contracts, milestones, invoices, and payments manually across documents, spreadsheets, and email.

Important information such as:

* Payment terms
* Contract value
* Milestone deadlines
* Client obligations
* Payment clauses
* Missing contract clauses

can be difficult to locate and track.

This project addresses the problem by combining **document processing, AI-powered contract analysis, and structured financial tracking** into one application.

---

## 💡 Solution

The application creates a complete workflow:

```text
Contract Upload
      ↓
File Validation
      ↓
PDF/DOCX Text Extraction
      ↓
AI Contract Analysis
      ↓
Structured JSON Validation
      ↓
Private Cloudinary Storage
      ↓
PostgreSQL Storage
      ↓
Dashboard
      ↓
Milestones / Invoices / Payments
      ↓
AI Chat & Payment Reminders
```

Instead of manually reading a contract and entering important information, the system extracts relevant details and makes them available through structured application features.

---

## ✨ Key Features

### 🔐 Authentication

* User registration and login
* JWT-based authentication
* Password hashing using bcrypt
* Protected API routes
* Ownership checks for contracts, milestones, invoices, and notifications

### 📄 Contract Management

* Upload PDF and DOCX contracts
* Private Cloudinary storage and downloads authorized by contract ownership
* Automatic text extraction
* Contract information extraction using AI
* Contract summaries
* Contract risk scoring
* Contract status tracking

### 🤖 AI Contract Intelligence

The system provides multiple AI-powered workflows:

#### Contract Analyzer

Extracts structured information such as:

* Client information
* Contract amount
* Milestones
* Important dates
* Payment terms
* Relevant clauses

#### Contract Summary

Generates a concise business-oriented summary of the contract.

#### Risk Assessment

Generates:

* Risk score from 1–10
* Missing clauses
* Potential contract risks
* Recommendations

#### Contract Chat

Allows users to ask questions about their uploaded contract using the extracted contract text as context.

Example:

```text
"What are the payment terms?"

"When is the final milestone due?"

"What happens if the client delays payment?"
```

#### AI Reminder Generator

Generates professional payment reminder emails based on invoice/payment information.

#### Scope Creep Detection

A bonus workflow that compares logged work against contract deliverables to identify potential work outside the original agreement.

---

## 📊 Milestone Management

Contracts can contain multiple milestones.

Users can:

* Create milestones
* View milestones
* Update milestones
* Track milestone status
* Associate milestones with contracts
* Track milestone due dates

Example:

```text
Website Development Contract

├── UI Design          → Completed
├── Frontend           → In Progress
├── Backend            → Pending
└── Deployment         → Pending
```

---

## 💰 Invoice & Payment Management

Invoices are associated with contracts and milestones.

The system tracks:

* Invoice amount
* Due date
* Invoice status
* Associated milestone
* Payment records
* Payment amount
* Payment date
* Payment method

This creates a structured relationship between:

```text
Contract
   ↓
Milestone
   ↓
Invoice
   ↓
Payment
```

---

## 🧠 AI Reliability

AI output is not directly stored in the database.

The processing flow is:

```text
AI Response
     ↓
JSON Validation
     ↓
Valid?
  ↙     ↘
Yes      No
 ↓        ↓
Store    Retry
         once
```

The system is designed to request structured JSON from the AI model, validate the response, and reject malformed responses before persistence.

AI temperature is kept low for more consistent structured outputs.

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js        │
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │     TypeScript      │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐     ┌────────────┐    ┌───────────┐
       │ PostgreSQL│     │  Gemini    │    │Cloudinary │
       │ + Prisma  │     │    API     │    │  Storage  │
       └───────────┘     └────────────┘    └───────────┘
                               │
                               ▼
                         ┌───────────┐
                         │  Resend   │
                         │   Email   │
                         └───────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* TypeScript
* REST APIs

### Database

* PostgreSQL
* Prisma ORM

### AI

* Gemini API
* Structured JSON responses

### Authentication

* JWT
* bcrypt

### Document Processing

* `pdf-parse` for PDF extraction
* `mammoth` for DOCX extraction

### External Services

* Cloudinary — document storage
* Resend — email delivery

### Validation & Security

* Zod
* JWT authentication
* Protected routes
* Per-user data access
* Input validation
* Rate limiting
* Environment variables

---

## 🗄️ Database Design

The application uses PostgreSQL with Prisma ORM.

### Main entities

```text
Users
  │
  └── Contracts
        │
        ├── Milestones
        │       │
        │       └── Invoices
        │               │
        │               └── Payments
        │
        └── Contract Data

Users
  │
  └── Notifications
```

### Core Tables

| Table         | Purpose                                      |
| ------------- | -------------------------------------------- |
| Users         | Authentication and user information          |
| Contracts     | Uploaded contracts and AI-generated analysis |
| Milestones    | Contract deliverables and deadlines          |
| Invoices      | Billing information and payment status       |
| Payments      | Payment records                              |
| Notifications | User notifications                           |

The database uses foreign-key relationships, timestamps, and Prisma migrations.

---

## 🔌 API Endpoints

All routes below use the `/api` prefix.

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Contracts

```text
POST /contracts/upload
GET  /contracts
GET  /contracts/:id
GET  /contracts/:id/download
PATCH /contracts/:id/contact
POST /contracts/:id/analyze
POST /contracts/:id/chat
GET  /contracts/:id/creep
POST /contracts/:id/worklog
```

### Milestones

```text
GET  /milestones
POST /milestones
PATCH /milestones/:id
DELETE /milestones/:id
```

### Invoices

```text
GET   /invoices
POST  /invoices
PATCH /invoices/:id
POST  /invoices/payment
DELETE /invoices/:id
```

### Email

```text
POST /emails/reminder
GET  /emails/notifications
PATCH /emails/notifications/:id
```

---

## 📁 Project Structure

```text
Smart_Contract_invoice_Intelligence_Engine/
│
├── client/
│   ├── app/
│   ├── components/
│   ├── public/
│   └── ...
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── ai/
│   ├── prisma/
│   ├── utils/
│   ├── validators/
│   ├── types/
│   └── ...
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` to your PostgreSQL database. Generate a unique `JWT_SECRET` of at least 32 characters.

```env
DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10

DEMO_MODE=true

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

**Never commit `.env` or production secrets to GitHub.**

Use `.env.example` to document required variables without exposing credentials.

---

## 🧑‍💻 Local Development

### Prerequisites

Make sure you have:

* Node.js 20+
* npm or pnpm
* PostgreSQL or Docker
* Git

For live integrations, you will also need accounts/API credentials for:

* Gemini
* Cloudinary
* Resend

---

### 1. Clone the repository

```bash
git clone <your-repository-url>

cd Smart_Contract_invoice_Intelligence_Engine
```

---

### 2. Install frontend dependencies

```bash
cd client
npm install
```

---

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

---

### 4. Configure environment variables

Create:

```text
server/.env
```

and add the required environment variables.

---

### 5. Setup Prisma

From the `server` directory:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

---

### 6. Start the backend

```bash
npm run dev
```

---

### 7. Start the frontend

Open another terminal:

```bash
cd client
npm run dev
```

The frontend should then be available at:

```text
http://localhost:3000
```

The frontend defaults to `http://localhost:5000/api`. Set `NEXT_PUBLIC_API_URL` in `client/.env.local` before building when the backend is hosted elsewhere. Set `CLIENT_URL` on the backend to the deployed frontend origin.

Set `DEMO_MODE=true` on the backend to run locally without provider credentials. Demo mode labels sample analysis, stores test documents in `.demo-files`, and simulates email delivery. Set `DEMO_MODE=false` and supply Gemini, Cloudinary, and Resend credentials for live integrations. Production always uses live mode.

### Verification

From `client`, run `npm run lint` and `npm run build`. From `server`, run `npm run build`, then run `npm run test:integration` with `TEST_DATABASE_URL` pointing to a migrated, disposable local PostgreSQL database. The integration suite starts its own API server and exercises document upload, downloads, billing, and simulated reminders.

---

## 🔄 Contract Processing Pipeline

When a user uploads a contract:

```text
1. User uploads PDF/DOCX
        ↓
2. Backend validates the file
        ↓
3. Text extracted from document
        ↓
4. Extracted text sent to Gemini
        ↓
5. AI returns structured JSON
        ↓
6. JSON response validated
        ↓
7. Document saved to authenticated Cloudinary storage
        ↓
8. Valid information saved to PostgreSQL
        ↓
9. Dashboard displays extracted information
```

This architecture separates document storage, text extraction, AI processing, validation, and persistence.

---

## 🔒 Security Considerations

The application is designed with several security mechanisms:

* Password hashing with bcrypt
* JWT authentication
* Protected routes
* Ownership checks for protected records
* Request validation with Zod
* File validation
* Per-process rate limits on authentication, AI requests, and reminders
* Input sanitization
* Environment-based secrets
* HTTPS in production
* Error logging

---

## ☁️ Deployment

The PRD specifies the following deployment architecture:

| Component    | Platform         |
| ------------ | ---------------- |
| Frontend     | Vercel           |
| Backend      | Railway / Render |
| PostgreSQL   | Neon             |
| File Storage | Cloudinary       |
| Email        | Resend           |
| AI           | Gemini API       |

Run `npx prisma migrate deploy` against the intended database before starting the updated API. The payment migration stores invoice and payment amounts to two decimal places. Legacy Cloudinary uploads retain their original access settings. Move legacy public assets to authenticated storage if they contain private documents.

---

## 🎯 Project Goals

The primary goal is to provide a stable end-to-end workflow where users can:

* Upload contracts
* Automatically extract contract information
* Understand contracts through AI summaries
* Identify potential risks
* Track milestones
* Manage invoices
* Track payments
* Ask questions about contracts
* Generate payment reminder emails

---

## 📚 Engineering Concepts Demonstrated

This project demonstrates practical experience with:

* Full-stack application architecture
* REST API development
* Authentication and authorization
* JWT and bcrypt
* PostgreSQL database design
* Prisma ORM
* Relational database relationships
* File uploads
* PDF/DOCX processing
* AI API integration
* Structured AI outputs
* Prompt engineering
* JSON validation
* Middleware
* Input validation
* Error handling
* Cloud storage
* Email APIs
* Environment configuration
* Frontend/backend separation

---

## 🚧 Future Improvements

Potential extensions include:

* Retrieval-Augmented Generation (RAG)
* Vector database integration
* Semantic contract search
* Advanced document retrieval
* Automated payment follow-ups
* More advanced scope-creep analysis
* Multi-agent contract workflows
* Analytics and financial forecasting

These are intentionally outside the current architecture described in the PRD.

---

## 📄 License

This project is intended for educational, portfolio, and internship purposes.
