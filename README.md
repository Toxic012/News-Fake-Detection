# TruthCode

AI-Powered News Authenticity Verification & Tamper Detection Platform

TruthCode is an AI-powered web platform designed to verify whether a news article, screenshot, newspaper page, image, PDF, or video matches the original content registered by an authenticated publisher.

Instead of determining whether a news story is true or false, TruthCode focuses on a narrower and objectively verifiable question:

"Does the submitted content match the original content registered by the publisher?"

The platform combines OCR, Natural Language Processing, Computer Vision, cryptographic hashing, Verification Codes, and QR Codes to compare submitted content with publisher-registered originals and generate evidence-based verification reports.

---

## Overview

Digital news is frequently redistributed through screenshots, PDFs, messaging applications, social media posts, cropped images, and edited videos. During redistribution, headlines, names, numbers, dates, paragraphs, images, or other elements can be modified while the content continues to appear as if it came from the original publisher.

TruthCode provides an authenticity verification layer between publishers and readers.

A publisher registers the original content with TruthCode and receives a unique Verification Code and QR Code. A reader can later submit received content and use the code or QR code to compare it with the registered original.

The verification result can contain:

- Verification status
- Similarity score
- Detected modifications
- OCR confidence
- NLP comparison results
- Visual differences
- Evidence details
- Downloadable verification report

---

## Problem Statement

Digital misinformation can originate from modified versions of legitimate news content.

Common examples include:

- Altered headlines
- Changed numbers or dates
- Modified names or entities
- Added or removed paragraphs
- Edited screenshots
- Cropped or overlaid images
- Manipulated video frames
- Reposted content presented as official publication

Traditional fact-checking generally attempts to determine whether a claim is true or false.

TruthCode addresses a different problem: content authenticity and integrity.

It compares a received copy against a publisher-registered original instead of making an editorial judgment about the underlying news story.

---

## Proposed Solution

TruthCode follows a publisher-controlled verification workflow:

Publisher
    |
    +-- Register Original Content
    |
    +-- Generate Content Hash
    |
    +-- Generate Verification Code
    |
    +-- Generate QR Code
             |
             v
      Registered Original
             |
             v
      Reader receives copy
             |
             +-- Enter Verification Code
             +-- Scan QR Code
             +-- Upload Content
                     |
                     v
              AI Verification
                     |
          +----------+----------+
          |          |          |
          v          v          v
         OCR        NLP         CV
          |          |          |
          +----------+----------+
                     |
                     v
             Evidence Generator
                     |
                     v
            Verification Report

---

## Core Features

### Publisher Portal

- Publisher organization registration
- Administrative approval workflow
- Secure authentication
- Upload original articles
- Upload newspaper PDFs
- Upload images
- Upload videos
- Generate unique Verification Codes
- Generate QR Codes
- Manage registered content
- View verification activity
- Publisher analytics

### Reader / User Portal

- Guest verification
- User registration and login
- Verification Code lookup
- QR Code verification
- Screenshot upload
- Image upload
- Video upload
- Content comparison
- Modification highlighting
- Verification history
- PDF report generation
- Shareable verification results

### Admin Portal

- Publisher approval and rejection
- User management
- Publisher management
- Account suspension and reinstatement
- System analytics
- Security event monitoring
- Audit log inspection
- Administrative activity tracking

### AI Verification Engine

- OCR-based text extraction
- Semantic text comparison
- Token-level difference detection
- Number and entity modification detection
- Image comparison
- Video frame comparison
- Evidence aggregation
- Confidence scoring
- Structured verification reports

---

## How It Works

### 1. Publisher Registration

A publisher registers its organization and submits the required verification information.

Publisher accounts remain pending until an administrator approves them.

### 2. Original Content Registration

After approval, the publisher uploads an original:

- Article
- Newspaper PDF
- Image
- Video

TruthCode stores the original content and generates a cryptographic content hash.

### 3. Verification Code Generation

Each registered content item receives a unique Verification Code and corresponding QR Code.

The code is associated with the registered original content.

### 4. Reader Verification

A reader can:

- Enter the Verification Code
- Scan the QR Code
- Upload the received content for comparison

The core guest verification flow can be accessed without requiring an account.

### 5. AI Processing

The submitted content is processed according to its media type.

Text-based submissions can proceed to NLP comparison.

Image-based submissions can pass through OCR before NLP comparison.

Images and videos can additionally pass through the Computer Vision pipeline.

### 6. Evidence Report

The outputs are aggregated into a structured report containing comparison evidence rather than an editorial truth judgment.

---

## AI Verification Pipeline

### OCR Pipeline

The OCR pipeline processes screenshots, scanned newspaper pages, and other image-based content.

Input Image
    |
    v
Preprocessing
    |
    +-- Grayscale
    +-- Denoising
    +-- Deskewing
    +-- Binarization
    |
    v
Text Region Detection
    |
    v
Text Recognition
    |
    +-- EasyOCR
    +-- Tesseract fallback
    |
    v
Post Processing
    |
    v
Confidence Gate
    |
    v
Extracted Text

OCR preprocessing can include grayscale conversion, denoising, deskewing, adaptive binarization, text-region detection, recognition, post-processing, and confidence checking.

---

## NLP Pipeline

The NLP pipeline compares the extracted or submitted text against the publisher's original.

It uses:

- Sentence-level embeddings
- Semantic similarity
- Cosine similarity
- Token-level diff
- Changed numbers
- Changed named entities
- Added words
- Removed words

Workflow:

Original Text --------+
                      |
                      +--> Sentence Embeddings
                      |
Submitted Text -------+
                      |
                      v
               Cosine Similarity
                      |
             +--------+--------+
             |                 |
             v                 v
      Semantic Score     Token-Level Diff
             |                 |
             +--------+--------+
                      |
                      v
              Aggregate NLP Score

---

## Computer Vision Pipeline

The Computer Vision pipeline compares original and submitted images or video frames.

Techniques include:

- ORB keypoint descriptors
- CNN-based embeddings
- SSIM
- Keypoint matching
- Pixel and region difference maps
- Difference bounding regions

Detected visual changes can include:

- Cropping
- Overlays
- Edited regions
- Visual modifications

---

## Video Verification

Video verification samples representative frames to reduce computational cost.

The sampled frames are compared against corresponding original frames or nearest matching frames.

Optional audio transcription can be used for additional NLP comparison.

The system can aggregate frame-level results into an overall video verification result with timestamps for detected segments.

---

## System Architecture

TruthCode follows a layered architecture separating the frontend, API services, asynchronous AI processing, and data storage.

Frontend
    |
    v
Nginx / API Gateway
    |
    +----------------+----------------+----------------+
    |                |                |                |
    v                v                v                v
Auth Service   Publisher Service   User Service   Admin Service
                       |
                       v
                Verification Service
                       |
                       v
                 Celery + Redis
                       |
             +---------+---------+
             |         |         |
             v         v         v
            OCR       NLP       CV
          Worker    Worker    Worker
             |         |         |
             +---------+---------+
                       |
                       v
               Evidence Generator
                       |
                       v
        +--------------+--------------+
        |              |              |
        v              v              v
   PostgreSQL       Redis        S3 / MinIO

The AI processing layer is asynchronous so computationally expensive OCR, NLP, and Computer Vision jobs do not block the API request path.

---

## Technology Stack

### Frontend

- React.js
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- JWT
- Nginx

### AI / ML

- EasyOCR
- Tesseract
- Sentence Transformers
- OpenCV
- ORB
- SSIM
- Whisper (optional)

### Infrastructure

- PostgreSQL
- Redis
- Celery
- Docker
- AWS S3 / S3-compatible storage
- MinIO for local development

---

## User Roles

TruthCode uses Role-Based Access Control.

| Role | Main Capabilities |
|------|------------------|
| Guest | Verify content using code or QR |
| User | Verify content, upload media, view history, download/share reports |
| Publisher | Register original content, generate codes/QRs, manage content and analytics |
| Admin | Approve publishers, manage accounts, monitor security, access audit logs |

---

## Project Structure

A typical backend structure:

app/
|
+-- routers/
|   +-- auth/
|   +-- publisher/
|   +-- user/
|   +-- verification/
|   +-- admin/
|
+-- services/
|
+-- repositories/
|
+-- models/
|
+-- schemas/
|
+-- workers/
|   +-- ocr/
|   +-- nlp/
|   +-- cv/
|   +-- evidence/
|
+-- core/
|   +-- config/
|   +-- security/
|   +-- dependencies/
|
+-- main.py

Docker deployment:

docker-compose.yml

nginx/
frontend/
backend/
worker/
redis/
postgres/
object-storage/

---

## Getting Started

### Prerequisites

Install:

- Git
- Python 3.11+
- Node.js 20+
- npm
- PostgreSQL
- Redis
- Docker
- Docker Compose

### Clone Repository

git clone [https://github.com/News-Fake-Detection/truthcode.git](https://github.com/Toxic012/News-Fake-Detection)

cd truthcode

### Frontend Setup

cd frontend

npm install

npm run dev

### Backend Setup

cd backend

python -m venv .venv

Windows:

.venv\Scripts\activate

Linux / macOS:

source .venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Run backend:

uvicorn app.main:app --reload

### Start Redis

redis-server

### Start Celery Worker

celery -A app.workers.celery_app worker --loglevel=info

Adjust the Celery application path according to the repository implementation.

---

## Environment Variables

Create a .env file based on the project's environment configuration.

Example:

APP_ENV=development

DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/truthcode

REDIS_URL=redis://localhost:6379/0

JWT_SECRET_KEY=your_secret_key

JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15

JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

STORAGE_ENDPOINT=http://localhost:9000

STORAGE_BUCKET=truthcode

STORAGE_ACCESS_KEY=your_access_key

STORAGE_SECRET_KEY=your_secret_key

MAX_UPLOAD_SIZE_MB=100

OCR_CONFIDENCE_THRESHOLD=0.75

IMPORTANT:

Never commit real credentials, API keys, JWT secrets, database passwords, or storage credentials to GitHub.

---

## Docker Deployment

TruthCode is designed to be containerized for local, staging, and production environments.

Typical deployment:

Nginx
 |
 +-- Frontend
 |
 +-- FastAPI Backend
        |
        +-- PostgreSQL
        +-- Redis
        +-- Celery Workers
        |      +-- OCR
        |      +-- NLP
        |      +-- CV
        |
        +-- S3 / MinIO

Start the environment:

docker compose up --build

Stop services:

docker compose down

---

## API Overview

Representative API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user or publisher |
| POST | /api/v1/auth/login | Authenticate user |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/publisher/content | Register original content |
| GET | /api/v1/publisher/content/{id} | Retrieve content |
| GET | /api/v1/publisher/analytics | Publisher analytics |
| POST | /api/v1/verify/code | Start verification |
| GET | /api/v1/verify/{jobId} | Check verification status |
| GET | /api/v1/verify/{jobId}/report | Retrieve verification report |
| POST | /api/v1/admin/publishers/{id}/approve | Approve publisher |
| GET | /api/v1/admin/audit-logs | Retrieve audit logs |

---

## Security

TruthCode includes:

- JWT-based authentication
- Short-lived access tokens
- Refresh-token sessions
- Role-Based Access Control
- Password hashing with bcrypt
- HTTPS/TLS
- Upload validation
- File type and size validation
- Rate limiting
- SHA-256 content hashing
- Administrative audit logging
- Controlled publisher approval workflow

Original publisher content is associated with a cryptographic hash so stored content integrity can be checked independently of the AI comparison pipeline.

---

## Performance Targets

The project defines the following Phase 1 targets:

| Metric | Target |
|--------|--------|
| Text verification response | < 5 seconds |
| Image/video verification | < 30 seconds |
| OCR accuracy on clean scans | > 90% |
| OCR accuracy on low-quality screenshots | > 75% |
| Tamper detection precision on synthetic test data | > 85% |
| Publisher onboarding after approval | < 10 minutes |
| Monthly uptime target | > 99.5% |

These values are engineering targets, not claims of measured production performance.

---

## Testing

TruthCode follows a layered testing strategy.

### Unit Testing

Backend:

pytest

Frontend:

npm test

### Integration Testing

Integration testing covers:

- API and database interaction
- Queue integration
- Authentication
- Verification workflows
- AI pipeline integration

### End-to-End Testing

Critical workflow:

Register
    |
    v
Login
    |
    v
Upload / Verify
    |
    v
AI Processing
    |
    v
Comparison
    |
    v
Evidence Report

The project plan includes Playwright for end-to-end testing and Locust for performance testing.

---

## Project Scope

### Included in Phase 1

- Publisher portal
- User portal
- Admin portal
- Guest verification
- Article verification
- PDF verification
- Image verification
- Video verification
- OCR
- NLP comparison
- Computer Vision comparison
- Verification Codes
- QR Codes
- Evidence reports
- Role-Based Access Control
- Audit logs
- Responsive web interface

### Not Included in Phase 1

- Automated truth/fake-news classification
- Real-time social media monitoring
- Blockchain notarization
- Native Android/iOS applications
- Full multilingual OCR/NLP
- Automated crawling of external social platforms

---

## Future Scope

Potential future extensions include:

1. Blockchain-based content hash notarization
2. Browser extension for one-click verification
3. Native Android and iOS applications
4. Multilingual OCR and NLP
5. Publisher APIs for direct CMS integration
6. Automated monitoring of social-media reposts
7. Expanded media verification capabilities

---

## Database Design

The PostgreSQL schema is organized into two major domains.

### Identity & Access

- roles
- permissions
- role_permissions
- users
- publishers
- sessions
- audit_logs
- activity_logs

### Content & Verification

- newspapers
- articles
- media
- verification_codes
- uploads
- ocr_results
- nlp_results
- cv_results
- verification_reports

The schema uses UUID-based primary keys, content hashes, status constraints, foreign keys, and indexes for verification-code lookups and publisher content management.

---

## Design Principles

### Evidence Over Verdicts

Verification results show comparison evidence, detected differences, and confidence information instead of presenting a simplistic true/false news judgment.

### Calm Under Uncertainty

Low-confidence OCR and inconclusive comparisons are explicitly represented rather than converted into misleading definitive results.

### Clear User Actions

The interface is designed around focused user flows with clear primary actions.

---

## Important Note

TruthCode is an authenticity and integrity verification system.

It does NOT determine whether the underlying news claim is factually true or false.

The system answers:

"Does this submitted content correspond to the publisher-registered original?"

It does not answer:

"Is this news story factually true?"

Example:

Original Publisher Content
        |
        v
TruthCode Registration
        |
        v
Received Screenshot
        |
        v
AI Comparison
        |
        +-- Match
        +-- Partial Match
        +-- Mismatch
        +-- Inconclusive / Low Confidence
        |
        v
Evidence Report

---

## Documentation

The project includes six engineering documentation documents:

1. Product Requirement Document
2. Technical Requirement Document
3. Application Web Flow Document
4. UI/UX Design Document
5. Database Schema Document
6. Implementation Plan Document

These documents define the product requirements, system architecture, application workflows, UI/UX system, database design, implementation roadmap, testing strategy, and deployment plan.

---

## Development Workflow

The project follows a lightweight Git workflow using short-lived feature branches.

Create a feature branch:

git checkout -b feature/your-feature

Implement and test the change.

Commit:

git add .

git commit -m "feat: add your feature"

Push:

git push origin feature/your-feature

Then create a Pull Request.

---

## Project Status

Development / Academic Project

TruthCode is being developed as a final-year engineering project combining:

- Full-Stack Web Development
- Artificial Intelligence
- Natural Language Processing
- Computer Vision
- Optical Character Recognition
- Cryptographic Content Integrity
- Distributed Processing
- Secure Software Architecture

---

## Author

Md Ammar Ozair

Final-Year B.Tech Information Technology Student

CMR Technical Campus, Hyderabad

---

## License

This project was developed as a final-year engineering project.

Add an appropriate LICENSE file to the repository before distributing the source code publicly.
