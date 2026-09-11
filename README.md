# CareBridge

**AI-Powered Medical Record Organization & Secure Sharing**

CareBridge helps patients organize their medical records, extract useful medical information from uploaded documents using AI, view their medical history as a timeline, ask questions about their records, and securely share records with doctors through temporary links.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [AI Processing Workflow](#ai-processing-workflow)
- [Technology Stack](#technology-stack)
- [Database Design](#database-design)
- [Security](#security)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Main API Endpoints](#main-api-endpoints)
- [Example User Flow](#example-user-flow)
- [Future Enhancements](#future-enhancements)
- [Project Status](#project-status)
- [Disclaimer](#disclaimer)

---

## Problem Statement

Medical records are often scattered across different hospitals, PDFs, prescriptions, and reports. Patients may have difficulty:

- Organizing their medical documents
- Understanding important information in medical reports
- Tracking their medical history chronologically
- Finding information quickly during a consultation
- Sharing relevant medical records securely with doctors

CareBridge provides a centralized platform to address these problems.

---

## Solution

CareBridge allows a patient to:

1. Create an account and securely log in
2. Upload medical PDF documents
3. Extract text from uploaded documents
4. Use AI to identify important medical information
5. View extracted medical information in a structured format
6. Automatically generate a medical timeline
7. Ask questions about their uploaded records
8. Generate a temporary secure sharing link
9. Allow a doctor to view shared records without requiring a patient login
10. Revoke the sharing link at any time
11. Maintain audit logs of important actions

---

## Key Features

### Patient Authentication
- User registration
- Secure login
- JWT-based authentication
- Protected API endpoints

### Medical Document Management
- PDF document upload
- Maximum upload size of 10 MB
- Backend PDF validation
- Duplicate document detection using SHA-256 hashing
- Document processing status

### AI Medical Extraction
CareBridge uses AI to extract structured information from medical documents, including:
- Diagnoses
- Symptoms
- Medications
- Tests
- Procedures
- Medical history
- Important dates

### Medical Timeline
Important events extracted from medical documents are stored as timeline events and displayed chronologically.

### Ask My Records
Patients can ask natural-language questions about their uploaded medical records.

**Example:**
> What medications are mentioned in my records?

The assistant answers using the patient's available medical records.

### Secure Doctor Sharing
Patients can create a temporary share link for their medical records. The link:
- Uses a cryptographically generated token
- Expires automatically after 24 hours
- Can be revoked by the patient
- Does not require the doctor to create an account

### Audit Logging
Important actions are recorded in the audit log, including:
- `DOCUMENT_UPLOADED`
- `DOCUMENT_PROCESSED`
- `SHARE_LINK_CREATED`
- `SHARE_LINK_REVOKED`

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │       Patient        │
                    │   React Frontend     │
                    └──────────┬───────────┘
                               │
                               │ HTTP / REST API
                               ▼
                    ┌──────────────────────┐
                    │    Express Server    │
                    │       Node.js        │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌──────────────┐  ┌─────────────┐
      │ PostgreSQL  │   │ PDF Processor │  │ OpenRouter  │
      │  Database   │   │  PDF → Text   │  │     AI      │
      └─────────────┘   └──────────────┘  └─────────────┘
             │
             ▼
      ┌──────────────────┐
      │ Medical Records   │
      │ Timeline          │
      │ Share Tokens      │
      │ Audit Logs        │
      └──────────────────┘
```

```text
        Doctor
          │
          │ Temporary Share Link
          ▼
┌──────────────────────┐
│     Doctor View       │
│   React Frontend      │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Public Share API     │
│  Token Verification   │
└──────────┬────────────┘
           │
           ▼
       PostgreSQL
```

---

## AI Processing Workflow

```text
Medical PDF
    │
    ▼
PDF Text Extraction
    │
    ▼
Text Cleaning
    │
    ▼
AI Medical Information Extraction
    │
    ▼
Structured Medical Data
    │
    ├── Diagnoses
    ├── Symptoms
    ├── Medications
    ├── Tests
    ├── Procedures
    ├── Medical History
    └── Important Dates
             │
             ▼
       PostgreSQL
             │
       ┌─────┴─────┐
       ▼           ▼
Medical Details  Timeline
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, JavaScript, HTML, CSS |
| **Backend** | Node.js, Express.js, REST APIs, JWT Authentication, Multer |
| **Database** | PostgreSQL |
| **AI** | OpenRouter, Medical-focused AI model |
| **Document Processing** | PDF text extraction, SHA-256 file hashing |

---

## Database Design

CareBridge uses the following main tables:

| Table | Description |
|---|---|
| `users` | Stores authentication and user information |
| `patient_profiles` | Stores patient-specific information such as date of birth, blood group, and emergency contact |
| `documents` | Stores uploaded medical documents and extracted medical information |
| `timeline_events` | Stores important medical events extracted from documents |
| `share_tokens` | Stores temporary secure sharing tokens, expiration times, and revocation information |
| `audit_logs` | Stores important system actions for accountability and security |

---

## Security

CareBridge includes several security measures:

- JWT-based authentication
- Protected API endpoints
- Restricted CORS
- Environment variables for secrets
- `.gitignore` protection for sensitive files
- PDF-only backend validation
- 10 MB upload limit
- SHA-256 duplicate detection
- Cryptographically generated share tokens
- 24-hour share-link expiration
- Share-link revocation
- Audit logging

Sensitive API keys and secrets are stored in environment variables and are not committed to the repository.

---

## Project Structure

```text
carebridge/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── profile.js
│   │   └── documents.js
│   │
│   ├── services/
│   │   ├── documentProcessor.js
│   │   └── medicalExtractor.js
│   │
│   ├── uploads/
│   ├── app.js
│   ├── db.js│   
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Installation

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd carebridge
```

### 2. Install frontend dependencies
```bash
cd client
npm install
```

### 3. Install backend dependencies
```bash
cd ../server
npm install
```

### 4. Configure environment variables

Create `server/.env` and add:

```env
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_api_key
```

> **Note:** Do not commit `.env` to GitHub.

---

## Database Setup

Create a PostgreSQL database named `carebridge`, then create the required tables:

- `users`
- `patient_profiles`
- `documents`
- `timeline_events`
- `share_tokens`
- `audit_logs`

---

## Running the Application

### Start Backend
```bash
cd server
npm start
```
Backend runs at: `http://localhost:5000`

### Start Frontend
Open another terminal:
```bash
cd client
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## Main API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
```

### Patient Profile
```
GET  /api/profile
PUT  /api/profile
```

### Documents
```
POST /api/documents/upload
GET  /api/documents
POST /api/documents/:id/process
GET  /api/documents/timeline
POST /api/documents/ask
```

### Secure Sharing
```
POST /api/documents/share
GET  /api/documents/share/:token
POST /api/documents/share/revoke
```

---

## Example User Flow

```text
Register
   ↓
Login
   ↓
Dashboard
   ↓
Upload Medical PDF
   ↓
AI Analysis
   ↓
Structured Medical Information
   ↓
Medical Timeline
   ↓
Ask My Records
   ↓
Create Secure Share Link
   ↓
Doctor Opens Link
   ↓
Doctor Views Medical Records
   ↓
Patient Can Revoke Access
```

---

## Future Enhancements

- Multiple healthcare providers
- More granular sharing permissions
- Selective document sharing
- Document preview/download
- Advanced medical search
- Doctor authentication
- Notifications
- Improved AI summarization
- Cloud storage
- Production deployment
- Stronger compliance and privacy controls

---

## Project Status

CareBridge MVP is currently functional with:

- ✅ Authentication
- ✅ Medical document processing
- ✅ AI extraction
- ✅ Timeline generation
- ✅ Medical-record Q&A
- ✅ Secure doctor sharing
- ✅ Share-link revocation
- ✅ Audit logging
- ✅ Duplicate upload protection
- ✅ Responsive frontend
- ✅ End-to-end testing

---

## Disclaimer

CareBridge is a prototype developed for **educational and hackathon purposes**.

It should not be considered a replacement for professional medical advice, diagnosis, or treatment.

Use synthetic or appropriately authorized medical data during development and testing.
