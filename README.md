# Smart Solar Microgrid Trading System

Client-server enterprise application built for **SE4040 – Enterprise Application Development** (BSc (Hons) IT Specialized in Software Engineering, SLIIT, Year 4 Semester 2, 2026).

A web application for Backoffice/Grid Operator staff, a pure native Android app for solar prosumers and grid operators, and a central C# Web API (FAT service pattern) backed by MongoDB, communicating exclusively over REST.

---

## 🏗️ Architecture

```
[Android App]  <---REST--->  [C# Web API on IIS]  <--->  [MongoDB]
[Web App]      <---REST--->        (same API)
```

- **Web app** — UI-only layer for Backoffice and Grid Operator users. No business logic, no direct database access.
- **Android app** — Pure native Android (no cross-platform frameworks), local SQLite for on-device persistence only. Used by Prosumers and Grid Operators.
- **Web API** — All business logic lives here (FAT service pattern). C# Web API hosted on Windows IIS, connected to MongoDB.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Web API | ASP.NET Core Web API (C#), hosted on IIS |
| Database | MongoDB |
| Web application | ASP.NET Core MVC / Razor Pages + Bootstrap 5 (or React.js) |
| Mobile application | Native Android (Kotlin/Java), SQLite, Retrofit/OkHttp, Google Maps SDK, QR scan/generate |
| Version control | Git + GitHub |

## 📂 Repository Structure

```
/WebAPI            → ASP.NET Core Web API solution (business logic, MongoDB access)
/WebApp             → Web application (Backoffice / Grid Operator UI)
/AndroidApp         → Native Android app (Prosumer / Grid Operator UI)
/Docs               → Diagrams, ER design, screenshots used in the report
/Report             → Final project report (PDF/DOCX)
README.md
```
> Adjust folder names above to match your actual repo layout once set up.

## ✨ Features

### Web Application (Backoffice / Grid Operator)
- Role-based login (Backoffice / Grid Operator)
- User management (Backoffice only)
- Prosumer account management — create, update, deactivate/reactivate (NIC as key)
- Microgrid node management — create with GPS/capacity/battery slots, update schedule, deactivate (blocked if active reservations exist)
- Energy slot reservation management — create/update/cancel (7-day scheduling window, 12-hour notice rule)

### Android Application (Prosumer / Grid Operator)
- Prosumer registration (NIC as primary key), profile edit, deactivation request
- Reserve, modify, cancel energy slots
- Transaction QR code generation on approval
- Dashboard: active/pending reservation counts, booking history, pending bookings, search
- Nearby grid nodes via Google Maps
- Grid Operator mode: scan prosumer QR, verify against server, finalize energy transfer

### Web Service (API)
- FAT service pattern — all business logic centralized here
- RESTful endpoints consumed by both clients
- MongoDB as the NoSQL data store

## 👥 Team & Individual Contributions

| Member | Module Owned |
|---|---|
| Sasin | Identity & Access (Login, User Management, API skeleton, IIS/MongoDB setup) |
| Ishara | Prosumer & Node Management |
| Nipuni | Reservations & Dashboards |
| Sasin | Operator Tools, Maps & QR |

> Individual contributions must be clearly mentioned per the assignment requirements — keep this table accurate and specific (not just "helped with everything").
