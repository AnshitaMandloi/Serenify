# 🎵 Serenify — Music Streaming & Recommendation System

> A backend-focused music streaming platform built with Spring Boot, featuring secure authentication, audio file streaming, and mood/genre-based song recommendations.

---

## 📌 Project Overview

**Serenify** is a RESTful backend system that replicates core functionalities of modern music streaming platforms like Spotify and Apple Music. It provides a complete pipeline — from user registration and authentication to uploading songs, streaming audio, and receiving personalized recommendations — all exposed through clean REST API endpoints.

The project also includes a lightweight HTML/CSS/JavaScript frontend that communicates with the backend via these APIs, offering a complete music player experience in the browser.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.5.4 |
| Security | Spring Security + BCrypt Password Encoding |
| Persistence | Spring Data JPA / Hibernate |
| Database | MySQL 8.x (Production) / H2 (Development) |
| Build Tool | Maven 3.8+ |
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| API Testing | Postman |
| IDE | Eclipse (Spring Tools Suite) / IntelliJ IDEA |
| Version Control | Git / GitHub |

### Spring Boot Dependencies (`pom.xml`)

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-web` | RESTful API development with embedded Tomcat |
| `spring-boot-starter-security` | Authentication, authorization, password encoding |
| `spring-boot-starter-data-jpa` | ORM and database abstraction |
| `spring-boot-starter-test` | Unit and integration testing |
| `mysql-connector-j` | MySQL database connectivity |
| `tomcat-embed-jasper` | JSP rendering support |

---

## ✨ Features & Functionalities

### 🔐 User Authentication
- New user registration with unique username and password
- BCrypt password hashing — plaintext passwords are never stored
- Spring Security-based login with session management
- Role-based access control (`ROLE_USER`, `ROLE_ADMIN`)
- Unauthorized access to protected endpoints returns `HTTP 401`

### 🎶 Song Management
- Upload songs with rich metadata: **Title, Artist, Genre, Mood, BPM, Language**
- Audio files stored on the local filesystem with UUID-prefixed filenames to prevent collisions
- File path recorded in the database for retrieval
- Retrieve all songs or a specific song by ID
- Supports audio formats: **MP3, WAV, OGG** (up to 50 MB per file)

### 📡 Audio Streaming
- Stream audio files directly via HTTP GET endpoint
- Browser-compatible byte streaming with proper MIME type headers (`audio/mpeg`, `audio/wav`)
- `Accept-Ranges: bytes` support for seek/scrub controls
- Playback initiates within **200–400ms** for local filesystem files
- No full file loading into memory — efficient I/O streaming

### 🤖 Recommendation Engine
- **Mood-based recommendations** — filter songs by mood (Happy, Sad, Energetic, Calm, Focused, Melancholy)
- **Genre-based recommendations** — filter by genre (Pop, Rock, Classical, Jazz, Bollywood, Indie, etc.)
- **Random song discovery** — returns a randomly selected song for serendipitous exploration

### 🖥️ Frontend UI
- Dark-themed, responsive single-page interface
- Login and Registration pages with client-side form validation
- Song library dashboard with mood filter toggles
- Audio player with play/pause, volume, and seek controls (HTML5 `<audio>` element)
- Song upload form with drag-and-drop file picker
- Dynamic recommendation view that re-renders without page reload

---

## 📁 Project Structure

```
Music-api/
├── src/
│   └── main/
│       ├── java/com/
│       │   ├── MusicApiApplication.java        # Entry point
│       │   ├── configuration/
│       │   │   └── SecurityConfig.java         # Spring Security setup
│       │   ├── controller/
│       │   │   ├── AuthController.java         # Register & Login endpoints
│       │   │   └── SongController.java         # Song CRUD, streaming, recommendations
│       │   ├── dao/
│       │   │   ├── SongRepository.java         # JPA queries for songs
│       │   │   └── UserRepository.java         # JPA queries for users
│       │   ├── entity/
│       │   │   ├── Song.java                   # Song domain model
│       │   │   └── User.java                   # User domain model
│       │   └── service/
│       │       ├── CustomUserDetailsService.java
│       │       └── SongService.java
│       └── resources/
│           ├── application.properties          # DB config, multipart limits
│           └── static/
│               ├── login.html
│               ├── register.html
│               ├── Serenify.html               # Main dashboard
│               ├── app.js
│               └── style.css
├── uploads/                                    # Stored audio files
├── pom.xml
└── README.md
```

---

## 🗄️ Database Schema

### `users` Table
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT |
| username | VARCHAR(100) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL (BCrypt hash) |
| role | VARCHAR(50) | DEFAULT 'ROLE_USER' |

### `songs` Table
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT |
| title | VARCHAR(200) | NOT NULL |
| artist | VARCHAR(200) | — |
| genre | VARCHAR(100) | — |
| mood | VARCHAR(100) | — |
| bpm | INT | — |
| language | VARCHAR(100) | — |
| file_path | VARCHAR(500) | NOT NULL |

---

## 🔌 REST API Endpoints

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/register` | POST | Register a new user | No |
| `/api/auth/login` | POST | Authenticate and get session | No |
| `/songs` | POST | Upload a song with audio file (multipart) | Yes |
| `/songs` | GET | Get all songs | Yes |
| `/songs/audio/{fileName}` | GET | Stream audio file | Yes |
| `/songs/recommend/mood/{mood}` | GET | Recommend songs by mood | Yes |
| `/songs/recommend/genre/{genre}` | GET | Recommend songs by genre | Yes |
| `/songs/recommend/random` | GET | Get a random song | Yes |

---

## ⚙️ Installation & Execution

### Prerequisites
- **JDK 17** or higher — [Download](https://www.oracle.com/java/technologies/downloads/)
- **Maven 3.8+** — [Download](https://maven.apache.org/download.cgi)
- **MySQL 8.x** running locally (or use XAMPP/WAMP)
- **Postman** or any REST client for API testing (optional)

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/<your-username>/Music-api.git
cd Music-api
```

**2. Set up the MySQL database**

Create a database (the app can auto-create it too via `createDatabaseIfNotExist=true`):
```sql
CREATE DATABASE song_db;
```

**3. Configure `application.properties`**

Edit `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/song_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.jpa.hibernate.ddl-auto=update
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```

**4. Build the project**
```bash
mvn clean install
```

**5. Run the application**
```bash
mvn spring-boot:run
```

The server starts at **`http://localhost:8080`**

**6. Open the frontend**

Navigate to `http://localhost:8080/login.html` in your browser.

### Using the API (Postman)

**Register a user:**
```json
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{ "username": "anshita", "password": "pass123" }
```

**Upload a song:**
```
POST http://localhost:8080/songs
Content-Type: multipart/form-data

song: {"title":"Levitating","artist":"Dua Lipa","genre":"Pop","mood":"Energetic","bpm":103,"language":"English"}
file: <your-audio-file.mp3>
```

**Stream audio:**
```
GET http://localhost:8080/songs/audio/<filename>.mp3
```

**Get mood-based recommendations:**
```
GET http://localhost:8080/songs/recommend/mood/Energetic
```

---

## 🖼️ Screenshots

### Login Page
<img width="1896" height="852" alt="image" src="https://github.com/user-attachments/assets/8a8d4e1b-504c-4eec-b6ec-5175e0ab4959" />

> Clean dark-themed login with username/password fields and a link to registration.

<img width="1916" height="847" alt="image" src="https://github.com/user-attachments/assets/70897383-5d78-49cf-8c46-8c530ded5d2a" />

> Clean dark-themed registration with username/password fields.

### Main Dashboard
<img width="1910" height="849" alt="image" src="https://github.com/user-attachments/assets/3153b5c0-a901-41cd-a4a7-20d8da2adc18" />
<img width="1897" height="813" alt="image" src="https://github.com/user-attachments/assets/f87e6c47-3528-4deb-a6cb-854516f0a25e" />
<img width="1917" height="875" alt="image" src="https://github.com/user-attachments/assets/a45bc961-fc8b-4ea0-aea3-ddcc9dddc90e" />

> Song library with mood filter toggles (Energetic, Calm, Focused, Happy), song cards showing BPM/genre/mood metadata, and a persistent bottom audio player.

### Song Upload Page
<img width="936" height="736" alt="image" src="https://github.com/user-attachments/assets/94cdf8be-4e24-4ecc-aca0-f24b140b1a32" />

> Form for entering song metadata (title, artist, genre, mood, BPM, language) and attaching an MP3/WAV/OGG file.

### Audio Player
<img width="1723" height="136" alt="image" src="https://github.com/user-attachments/assets/289c7c54-c5ef-42db-b9e4-7abfdbad23e8" />

> Embedded HTML5 audio player with play/pause, seek, and volume controls driven by `/songs/audio/{fileName}`.

### Database — users Table
<img width="1240" height="419" alt="image" src="https://github.com/user-attachments/assets/fa5027fc-5a83-42aa-8012-60d21ed0a4b0" />

> BCrypt-hashed passwords (`$2a$10$...`) confirming secure credential storage.

### Database — songs Table
<img width="1122" height="685" alt="image" src="https://github.com/user-attachments/assets/4f7512be-96b3-49c6-bb6c-2149a2c6ae26" />

> All metadata columns populated with server-side `file_path` references to stored audio files.

---

## 👩‍💻 Team Members

| Name | Enrollment No. | Role |
|---|---|---|
| **Anshita Mandloi** | EN23CS301157 | Developer — Full Backend & Frontend |

**Project Guides:**
- Prof. Shantilal Bhayal — Department of Computer Science & Engineering, MediCaps University
- Prof. Amrata Gupta — Department of Computer Science & Engineering, MediCaps University

**Institution:** MediCaps University, Indore — April 2026

---

## 🚀 Future Enhancements

- **JWT Authentication** — Replace HTTP Basic auth with stateless JSON Web Tokens
- **Cloud Storage** — AWS S3 / Google Cloud Storage for scalable audio hosting
- **ML-Based Recommendations** — Collaborative filtering or neural network models
- **Playlist Management** — Create, queue, and share playlists
- **Full-Text Search** — Apache Lucene / Elasticsearch across song metadata
- **Mobile App** — React Native / Flutter client consuming the REST API
- **OAuth2 / Social Login** — Sign in with Google or GitHub
- **Analytics Dashboard** — Play counts, trending songs, listening history

---

## 📄 License

This project was developed as a Minor Project for the Bachelor of Technology (Computer Science & Engineering) degree at MediCaps University, Indore. It is intended for academic purposes.
