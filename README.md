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

| Name                      | IT Number  | Individual Contribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ransara N.S.**          | IT22102096 | • Designed the overall system architecture covering the Web, Android, and Web API layers, including the FAT service pattern.<br>• Set up the initial ASP.NET Core Web API skeleton, routing structure, and MongoDB connection.<br>• Implemented the Identity & Access module, including `AuthController` and `UsersController`.<br>• Implemented role-based access control and login redirection for Backoffice and Grid Operator roles.<br>• Configured and deployed the Web API and web application on IIS.<br>• Set up the GitHub repository, branching strategy, and coordinated team merges.<br>• Led team planning, module allocation, and weekly integration testing.<br>• Co-authored the system architecture diagram, use case diagram, and introduction section. |
| **Chamudi K.S.I.**        | IT22147950 | • Implemented `ProsumersController` for registration, profile updates, deactivation/reactivation, and NIC-based lookup.<br>• Implemented `NodesController`, including prevention of node deactivation when active reservations exist.<br>• Built Prosumer Management screens and Microgrid Node Management screens for the web application.<br>• Built the Android registration, profile editing, and deactivation-request flows.<br>• Implemented the pending-activation view for Backoffice staff.<br>• Contributed to the Prosumers and MicrogridNodes database schema and sample seed data.<br>• Tested prosumer and node management end-to-end across Web, API, and Android.<br>• Co-authored the database design and DFD sections of the report.                     |
| **Bandara H.M.N.T.**      | IT22251664 | • Implemented `ReservationsController`, including the 7-day scheduling window and 12-hour update/cancellation rules.<br>• Built reservation management screens for Backoffice and Grid Operator users.<br>• Built the Android reservation flow for reserving, modifying, and cancelling energy slots.<br>• Implemented the mobile dashboard with reservation counts and approved future reservations.<br>• Implemented booking history and search-booking views using live API data.<br>• Contributed to the `EnergyReservations` collection schema and validation rules.<br>• Tested the complete reservation lifecycle against the enforced business rules.<br>• Co-authored use case diagram relationships and reservation workflow screenshots.                        |
| **Senarathne S.M.B.V.B.** | IT22372444 | • Implemented QR code generation after reservation approval and the server-side QR verification endpoint.<br>• Built the Grid Operator mobile flow for QR scanning, server verification, and energy transfer finalization.<br>• Integrated Google Maps SDK to display nearby microgrid nodes and station details.<br>• Set up local SQLite persistence for Android login details and reference data.<br>• Built operator monitoring screens for tracking power-trading bookings.<br>• Tested QR verification and Google Maps integration across multiple devices.<br>• Contributed to service-integration testing between both clients and the hosted Web API.<br>• Co-authored the mobile UI screenshots and challenges section.                                          |


> Individual contributions must be clearly mentioned per the assignment requirements — keep this table accurate and specific (not just "helped with everything").
