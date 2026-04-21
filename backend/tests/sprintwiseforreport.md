# RoomBox — Sprint-Wise Development Report
**Project:** RoomBox — Nepal's Room Rental Platform  
**Methodology:** Agile Scrum  
**Total Sprints:** 5 Development Sprints + Testing + Closure  
**Project Duration:** November 10, 2025 – April 30, 2026

---

## Sprint Overview (from Gantt Chart)

| Sprint | Name | Start | End | Duration |
|---|---|---|---|---|
| Sprint 1 | Planning and Analysis | Dec 15, 2025 | Dec 30, 2025 | 12 days |
| Sprint 2 | System Architecture | Dec 29, 2025 | Jan 14, 2026 | 12 days |
| Sprint 3 | Core Authentication | Jan 14, 2026 | Jan 30, 2026 | 12 days |
| Sprint 4 | Full-Stack Development | Jan 29, 2026 | Mar 13, 2026 | 32 days |
| Sprint 5 | Data & AI Intelligence | Mar 11, 2026 | Mar 26, 2026 | 12 days |
| Testing | Unit & Integration Testing | Apr 20, 2026 | Apr 22, 2026 | 2 days |
| Closure | Deployment & Finalisation | Apr 27, 2026 | Apr 30, 2026 | 2 days |

---

---

# 3.9. Sprint 1 — Planning and Analysis

**Sprint Name:** Planning and Analysis  
**Duration:** December 15, 2025 – December 30, 2025

---

## 3.9.1. Sprint Planning

This sprint focused on establishing the foundation of the RoomBox project. The team conducted detailed requirement gathering, defined user roles (Tenant, Landlord, Admin), and documented project objectives. Work included creating the project roadmap, identifying all functional and non-functional requirements, mapping out entity relationships, and producing initial data flow diagrams. No production code was written in this sprint; the deliverables were planning and analysis documents that would guide all subsequent sprints.

### Sprint 1 — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US1 | As a user, I want to register an account as a Tenant or Landlord. | 5 |
| US2 | As a user, I want to log in securely using JWT-based authentication. | 5 |

**Table 2: Sprint 1 — Backlogs**

**Total Story Points Planned:** 10  
**Total Story Points Completed:** 10 (planning artefacts delivered)

---

## 3.9.2. Design

### 3.9.2.1. High-Level Use Cases

**UC001 – User Registration**

| Field | Description |
|---|---|
| Use Case ID | UC001 |
| Use Case Name | User Registration |
| Actor(s) | Tenant, Landlord |
| Description | New users create a RoomBox account by providing their full name, email address, phone number, password, and selecting a user role (Tenant or Landlord). The system validates all input, hashes the password securely using bcrypt, generates an email verification token, and stores the account. A verification email is sent to the provided address. The account remains unverified until the email link is clicked. |

**Table 3: High-Level Use Case — UC001 – User Registration**

---

**UC002 – User Login**

| Field | Description |
|---|---|
| Use Case ID | UC002 |
| Use Case Name | User Login |
| Actor(s) | Tenant, Landlord, Admin |
| Description | Registered users access the platform by entering their email and password. The backend verifies the credentials, checks the account's verification status, and issues a JWT access token on success. The token is stored in the browser's localStorage and used for all subsequent authenticated API requests. Role-based redirection sends Tenants to the search page and Landlords to their dashboard. |

**Table 4: High-Level Use Case — UC002 – User Login**

---

### 3.9.2.2. Activity Diagram

> **Figure 1:** Activity Diagram — User Registration Flow  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 2:** Activity Diagram — User Login Flow  
> *(Screenshot / Diagram to be inserted here)*

---

### 3.9.2.3. Sequence Diagram

> **Figure 3:** Sequence Diagram — User Registration  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 4:** Sequence Diagram — User Login  
> *(Screenshot / Diagram to be inserted here)*

---

### 3.9.2.4. Wireframe

> **Figure 5:** Wireframe — Registration Page  
> *(Screenshot to be inserted here)*

> **Figure 6:** Wireframe — Login Page  
> *(Screenshot to be inserted here)*

---

## 3.9.3. Development

### 3.9.3.1. Frontend
- Initial Next.js project scaffolding
- Tailwind CSS configuration
- Page routing structure defined

### 3.9.3.2. Backend
- FastAPI project structure initialised
- PostgreSQL database connection established
- SQLAlchemy models and Alembic migration baseline created

> **Figure 7:** Sprint 1 — Project structure and initial setup screenshot  
> *(Screenshot to be inserted here)*

---

## 3.9.4. Velocity Chart

> **Figure 8:** Velocity Chart — Sprint 1  
> *(Chart to be inserted here)*

---

## 3.9.5. Burn-Down Chart

> **Figure 9:** Burn-Down Chart — Sprint 1  
> *(Chart to be inserted here)*

---
---

# 3.10. Sprint 2 — System Architecture

**Sprint Name:** System Architecture  
**Duration:** December 29, 2025 – January 14, 2026

---

## 3.10.1. Sprint Planning

This sprint focused on defining and documenting the full technical architecture of RoomBox before any significant coding began. Work included selecting the technology stack (FastAPI + PostgreSQL + Next.js), designing the complete database schema with all entity relationships, creating ER diagrams, and producing UI/UX wireframes for all key pages. The data flow between frontend, backend, and database was mapped. API contract definitions (endpoints, request/response shapes) were documented for use in Sprint 3 onwards.

### Sprint 2 — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US14 | As a landlord, I want to create a new property listing with all details. | 8 |
| US28 | As the system, I want to automatically prevent double-booking. | 8 |
| US30 | As a user, I want a fully responsive and mobile-friendly interface. | 5 |

**Table 5: Sprint 2 — Backlogs**

**Total Story Points Planned:** 21  
**Total Story Points Completed:** 21 (architecture documents and wireframes delivered)

---

## 3.10.2. Design

### 3.10.2.1. High-Level Use Cases

**UC003 – Room Listing Creation**

| Field | Description |
|---|---|
| Use Case ID | UC003 |
| Use Case Name | Room Listing Creation |
| Actor(s) | Landlord |
| Description | A landlord creates a new room listing by providing title, description, room type, city, address, monthly rent, security deposit, advance payment, tenancy duration in days, furnishing status, and amenities. Images can be uploaded. The system validates all required fields, stores the listing with status "available", and makes it immediately discoverable in tenant search results. |

**Table 6: High-Level Use Case — UC003 – Room Listing Creation**

---

**UC004 – Database and API Architecture**

| Field | Description |
|---|---|
| Use Case ID | UC004 |
| Use Case Name | System Architecture Design |
| Actor(s) | Development Team |
| Description | The system architecture is defined with a REST API backend (FastAPI), a relational database (PostgreSQL via SQLAlchemy), and a React frontend (Next.js). All API endpoints follow a versioned path `/api/v1/`. JWT authentication is used for all protected routes. CORS is configured to allow requests from the frontend origin. |

**Table 7: High-Level Use Case — UC004 – System Architecture**

---

### 3.10.2.2. Activity Diagram

> **Figure 10:** Activity Diagram — Room Listing Creation Flow  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 11:** Entity Relationship Diagram — Full RoomBox Database Schema  
> *(Diagram to be inserted here)*

---

### 3.10.2.3. Sequence Diagram

> **Figure 12:** Sequence Diagram — Landlord Lists a Property  
> *(Diagram to be inserted here)*

---

### 3.10.2.4. Wireframe

> **Figure 13:** Wireframe — List Property Page  
> *(Screenshot to be inserted here)*

> **Figure 14:** Wireframe — Landlord Dashboard  
> *(Screenshot to be inserted here)*

> **Figure 15:** Wireframe — Tenant Search Page  
> *(Screenshot to be inserted here)*

---

## 3.10.3. Development

### 3.10.3.1. Frontend
- Component library and shared UI components planned
- Page routing structure for all roles defined
- Tailwind CSS design tokens configured (colours, spacing, typography)

### 3.10.3.2. Backend
- All SQLAlchemy models defined: `User`, `Room`, `Booking`, `Payment`, `Tenancy`, `Message`
- Alembic migration files generated for initial schema
- Database initialisation script created

> **Figure 16:** Sprint 2 — Database schema and migration output screenshot  
> *(Screenshot to be inserted here)*

---

## 3.10.4. Velocity Chart

> **Figure 17:** Velocity Chart — Sprint 2  
> *(Chart to be inserted here)*

---

## 3.10.5. Burn-Down Chart

> **Figure 18:** Burn-Down Chart — Sprint 2  
> *(Chart to be inserted here)*

---
---

# 3.11. Sprint 3 — Core Authentication

**Sprint Name:** Core Authentication  
**Duration:** January 14, 2026 – January 30, 2026

---

## 3.11.1. Sprint Planning

This sprint delivered the complete authentication system for RoomBox. It covered user registration, login with JWT, email verification using tokenised links, and the full forgot/reset password flow. The backend implemented bcrypt password hashing, token generation, and Gmail SMTP email delivery. The frontend pages for Register, Login, Verify Email, Forgot Password, and Reset Password were all built with a consistent glassmorphism design using the login page background image.

### Sprint 3 — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US1 | As a user, I want to register an account as a Tenant or Landlord. | 5 |
| US2 | As a user, I want to log in securely using JWT-based authentication. | 5 |
| US3 | As a user, I want to verify my email address after registration by clicking a verification link. | 3 |
| US4 | As a user, I want to reset my password via a secure email link. | 3 |

**Table 8: Sprint 3 — Backlogs**

**Total Story Points Planned:** 16  
**Total Story Points Completed:** 16

---

## 3.11.2. Design

### 3.11.2.1. High-Level Use Cases

**UC005 – User Login**

| Field | Description |
|---|---|
| Use Case ID | UC005 |
| Use Case Name | Secure Login |
| Actor(s) | Tenant, Landlord, Admin |
| Description | The user enters their email and password on the login page. The backend verifies credentials, checks whether the email is verified, and returns a JWT token on success. If the email is not verified, an amber banner appears with a resend option. Admin users are directed to a separate admin login endpoint. Role-based redirection routes tenants to search and landlords to their dashboard. |

**Table 9: High-Level Use Case — UC005 – Secure Login**

---

**UC006 – Email Verification**

| Field | Description |
|---|---|
| Use Case ID | UC006 |
| Use Case Name | Email Verification |
| Actor(s) | Tenant, Landlord |
| Description | After registration, the system generates a unique verification token and emails a clickable link to the user. When the user clicks the link, the `/verify-email` page automatically sends the token to the backend, which marks the account as verified. The page displays a success state with a "Sign In to RoomBox" button. Expired or invalid tokens show an error state with options to register again or return to login. |

**Table 10: High-Level Use Case — UC006 – Email Verification**

---

**UC007 – Forgot Password**

| Field | Description |
|---|---|
| Use Case ID | UC007 |
| Use Case Name | Password Reset via Email |
| Actor(s) | Tenant, Landlord |
| Description | A user who has forgotten their password enters their email on the `/forgot-password` page. The system generates a time-limited (1 hour) reset token and sends a branded HTML email with a reset button. The user clicks the link and lands on `/reset-password?token=...` where they enter and confirm a new password. A real-time strength meter and match indicator guide the user. On success, the password is updated and the user is redirected to login. |

**Table 11: High-Level Use Case — UC007 – Password Reset**

---

### 3.11.2.2. Activity Diagram

> **Figure 19:** Activity Diagram — Login Flow  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 20:** Activity Diagram — Registration and Email Verification  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 21:** Activity Diagram — Forgot Password Flow  
> *(Screenshot / Diagram to be inserted here)*

---

### 3.11.2.3. Sequence Diagram

> **Figure 22:** Sequence Diagram — Login  
> *(Diagram to be inserted here)*

> **Figure 23:** Sequence Diagram — Registration  
> *(Diagram to be inserted here)*

> **Figure 24:** Sequence Diagram — Password Reset  
> *(Diagram to be inserted here)*

---

### 3.11.2.4. Wireframe

> **Figure 25:** Wireframe — Login Page  
> *(Screenshot to be inserted here)*

> **Figure 26:** Wireframe — Register Page  
> *(Screenshot to be inserted here)*

> **Figure 27:** Wireframe — Forgot Password Page  
> *(Screenshot to be inserted here)*

> **Figure 28:** Wireframe — Reset Password Page  
> *(Screenshot to be inserted here)*

---

## 3.11.3. Development

### 3.11.3.1. Frontend
- `/register` — Registration form with user type selector (Tenant / Landlord), all fields, password confirmation, and post-registration "Check your email" success screen
- `/login` — Login form with email/password, forgot password link, and unverified email banner with resend option
- `/verify-email` — Auto-verifying page with loading, success, already-verified, and error states
- `/forgot-password` — Email request form with success confirmation screen and resend option
- `/reset-password` — Token-based new password form with real-time strength meter and match indicator

> **Figure 29:** Sprint 3 — Login page frontend screenshot  
> *(Screenshot to be inserted here)*

> **Figure 30:** Sprint 3 — Register page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 31:** Sprint 3 — Email verification received in inbox  
> *(Screenshot to be inserted here)*

> **Figure 32:** Sprint 3 — Verify email success page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 33:** Sprint 3 — Forgot password page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 34:** Sprint 3 — Reset password page screenshot  
> *(Screenshot to be inserted here)*

---

### 3.11.3.2. Backend
- `POST /api/v1/auth/register` — Registers user, hashes password, generates and stores email verification token, sends verification email via Gmail SMTP
- `POST /api/v1/auth/login` — Validates credentials, returns JWT token and `is_verified` flag
- `GET /api/v1/auth/verify-email?token=` — Validates token, marks user as verified, clears token
- `POST /api/v1/auth/resend-verification` — Generates new token and resends verification email
- `POST /api/v1/auth/forgot-password` — Generates 1-hour reset token and sends reset email
- `POST /api/v1/auth/reset-password` — Validates token and expiry, updates hashed password, clears token

> **Figure 35:** Sprint 3 — Backend authentication API endpoints screenshot  
> *(Screenshot to be inserted here)*

> **Figure 36:** Sprint 3 — JWT token generation and verification backend screenshot  
> *(Screenshot to be inserted here)*

> **Figure 37:** Sprint 3 — Gmail SMTP email delivery confirmation screenshot  
> *(Screenshot to be inserted here)*

---

## 3.11.4. Velocity Chart

> **Figure 38:** Velocity Chart — Sprint 3  
> *(Chart to be inserted here)*

---

## 3.11.5. Burn-Down Chart

> **Figure 39:** Burn-Down Chart — Sprint 3  
> *(Chart to be inserted here)*

---
---

# 3.12. Sprint 4 — Full-Stack Development

**Sprint Name:** Full-Stack Development  
**Duration:** January 29, 2026 – March 13, 2026

---

## 3.12.1. Sprint Planning

This was the longest and most feature-rich sprint, delivering the core room rental functionality of RoomBox end-to-end. It included tenant-facing room search with filters and image carousels, the full booking and eSewa payment flow, tenant tracking, landlord property management, the complete landlord dashboard with tenant management and chat inbox, and the admin panel with user/room/payment/booking management. This sprint covered the majority of the product backlog and formed the central deliverable of the RoomBox platform.

### Sprint 4 — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US5 | As a tenant, I want to search for available rooms by city, type, and price range. | 8 |
| US6 | As a tenant, I want to filter rooms by amenities (WiFi, Kitchen, Parking). | 5 |
| US7 | As a tenant, I want to view a room detail page with a multi-image carousel. | 8 |
| US8 | As a tenant, I want to contact a landlord via built-in chat from the room detail page. | 8 |
| US9 | As a tenant, I want to submit a booking request for a room. | 8 |
| US10 | As a tenant, I want to pay via the eSewa payment gateway. | 13 |
| US11 | As a tenant, I want to view all my bookings — active, pending, and past. | 5 |
| US12 | As a tenant, I want to track my active tenancy with progress bar and rent due date. | 8 |
| US13 | As a tenant, I want to vacate or drop a room via a modal confirmation. | 5 |
| US14 | As a landlord, I want to create a new property listing with all details. | 8 |
| US15 | As a landlord, I want to set a tenancy duration in days. | 5 |
| US16 | As a landlord, I want to edit and update my existing property listings. | 5 |
| US17 | As a landlord, I want a dashboard with overview statistics. | 8 |
| US18 | As a landlord, I want to confirm payment receipt for pending bookings. | 5 |
| US19 | As a landlord, I want to manage tenants — renew stays and vacate tenants. | 8 |
| US20 | As a landlord, I want to view and reply to tenant chat messages in my dashboard. | 8 |
| US21 | As a landlord, I want a listings tab showing room status and tenant details. | 5 |
| US22 | As an admin, I want to log into a separate admin panel. | 5 |
| US23 | As an admin, I want to manage all registered users. | 13 |
| US24 | As an admin, I want to deactivate room listings with a mandatory reason. | 8 |
| US26 | As an admin, I want to view all payment records. | 8 |
| US27 | As an admin, I want to view and manage all bookings. | 8 |
| US28 | As the system, I want to prevent double-booking. | 8 |
| US29 | As the system, I want to lock a room after payment and free it after tenancy expiry. | 8 |

**Table 12: Sprint 4 — Backlogs**

**Total Story Points Planned:** 177  
**Total Story Points Completed:** 177

---

## 3.12.2. Design

### 3.12.2.1. High-Level Use Cases

**UC008 – Room Search and Filtering**

| Field | Description |
|---|---|
| Use Case ID | UC008 |
| Use Case Name | Room Search and Filtering |
| Actor(s) | Tenant |
| Description | A tenant visits the search page and enters search criteria including city, room type, minimum and maximum price, furnishing status, search radius, and amenity toggles (WiFi, Kitchen, Parking). The system queries the database and returns matching room cards. Filter chips appear above results for each active filter. Removing a chip instantly re-runs the search. Clicking a card opens the room detail page. |

**Table 13: High-Level Use Case — UC008 – Room Search**

---

**UC009 – Room Booking and eSewa Payment**

| Field | Description |
|---|---|
| Use Case ID | UC009 |
| Use Case Name | Room Booking with eSewa Payment |
| Actor(s) | Tenant |
| Description | A logged-in tenant clicks "Book This Room" on a room detail page and is taken to the booking form. The form displays the monthly rent, security deposit, advance payment, and total amount. The system calculates the eSewa payment amount and generates an HMAC-SHA256 signature. The tenant clicks "Proceed to Payment" and is redirected to the eSewa test gateway. After payment, eSewa redirects back to the success page where the backend decodes the response, verifies the signature, activates the booking, and marks the room as occupied. |

**Table 14: High-Level Use Case — UC009 – Booking and Payment**

---

**UC010 – Landlord Dashboard and Tenant Management**

| Field | Description |
|---|---|
| Use Case ID | UC010 |
| Use Case Name | Landlord Dashboard |
| Actor(s) | Landlord |
| Description | After login, a landlord accesses a six-tab dashboard: Overview (stats), Listings (all rooms), Tenants (active occupancies with renewal/vacate), Bookings (pending confirmations), Income (payment history), and Messages (chat inbox). The Overview shows four KPI cards. The Tenants tab shows tenancy progress bars with days remaining and alerts for tenancies expiring within 30 days. Landlords can extend a tenancy or vacate a tenant via a modal confirmation dialog. |

**Table 15: High-Level Use Case — UC010 – Landlord Dashboard**

---

**UC011 – Admin Panel**

| Field | Description |
|---|---|
| Use Case ID | UC011 |
| Use Case Name | Admin Panel |
| Actor(s) | Admin |
| Description | An admin logs into the system via a separate `/admin/login` route using admin credentials. The admin panel consists of five sections: Dashboard (analytics with charts), Users (view/deactivate/reactivate), Rooms (view/admin-deactivate with reason), Bookings (all bookings), and Payments (full audit trail). Admin deactivation of a room requires a written reason and permanently locks the room so the landlord cannot re-activate it. |

**Table 16: High-Level Use Case — UC011 – Admin Panel**

---

**UC012 – Tenant-Landlord Chat**

| Field | Description |
|---|---|
| Use Case ID | UC012 |
| Use Case Name | Chat Messaging System |
| Actor(s) | Tenant, Landlord |
| Description | A tenant initiates a chat with a landlord from the room detail page. An HTTP-polling based chat system sends and retrieves messages every 2 seconds. Tenants access their messages via `/tenant/messages` and landlords access theirs via the Messages tab in the dashboard. Each conversation is scoped to a room. Messages are displayed as colour-coded bubbles (blue for sent, grey for received). |

**Table 17: High-Level Use Case — UC012 – Chat Messaging**

---

### 3.12.2.2. Activity Diagram

> **Figure 40:** Activity Diagram — Tenant Booking and Payment Flow  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 41:** Activity Diagram — Landlord Dashboard and Tenant Management  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 42:** Activity Diagram — Admin Room Deactivation  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 43:** Activity Diagram — Tenant Chat Initiation  
> *(Screenshot / Diagram to be inserted here)*

---

### 3.12.2.3. Sequence Diagram

> **Figure 44:** Sequence Diagram — Booking and eSewa Payment  
> *(Diagram to be inserted here)*

> **Figure 45:** Sequence Diagram — Landlord Confirms Payment  
> *(Diagram to be inserted here)*

> **Figure 46:** Sequence Diagram — Admin Deactivates Room  
> *(Diagram to be inserted here)*

---

### 3.12.2.4. Wireframe

> **Figure 47:** Wireframe — Tenant Search Page with Filters  
> *(Screenshot to be inserted here)*

> **Figure 48:** Wireframe — Room Detail Page with Carousel  
> *(Screenshot to be inserted here)*

> **Figure 49:** Wireframe — Booking Form Page  
> *(Screenshot to be inserted here)*

> **Figure 50:** Wireframe — Tenant Bookings Page  
> *(Screenshot to be inserted here)*

> **Figure 51:** Wireframe — Tenant Tracking Page  
> *(Screenshot to be inserted here)*

> **Figure 52:** Wireframe — Landlord Dashboard  
> *(Screenshot to be inserted here)*

> **Figure 53:** Wireframe — Admin Dashboard  
> *(Screenshot to be inserted here)*

---

## 3.12.3. Development

### 3.12.3.1. Frontend
- `/tenant/search` — Search page with city, type, price, furnishing, radius, and amenity filters; filter chips; room cards grid
- `/tenant/room/[id]` — Room detail with multi-image carousel, amenities, owner name (no phone), booking button, and chat button
- `/tenant/room/[id]/booking` — Booking form with financial breakdown and eSewa payment redirect
- `/payment/success` — eSewa success page decoding base64 response, verifying and activating booking
- `/payment/failure` — Failure page cancelling booking and returning room to available
- `/tenant/bookings` — Bookings page sorted into Active, Pending, and History sections with days remaining counter
- `/tenant/tracking` — Active tenancy tracker with progress bar, next rent date, payment history, and vacate modal
- `/tenant/messages` — Chat inbox with conversation list and real-time message polling
- `/landlord/list-property` — Property listing form with all fields including tenancy duration
- `/landlord/edit-property/[id]` — Edit existing listing form
- `/landlord/dashboard` — Six-tab dashboard: Overview, Listings, Tenants (with renew/vacate modal), Bookings, Income, Messages
- `/landlord/tracking` — Landlord-side tenancy tracking overview
- `/admin/login` — Separate admin authentication page
- `/admin` — Analytics dashboard with bar charts, donut charts, and KPI cards
- `/admin/users` — User management table with search, filter, and activate/deactivate actions
- `/admin/rooms` — Room management with admin deactivation modal requiring reason
- `/admin/bookings` — Full bookings management table
- `/admin/payments` — Payments audit table with status filter and summary cards

> **Figure 54:** Sprint 4 — Tenant search page with filters screenshot  
> *(Screenshot to be inserted here)*

> **Figure 55:** Sprint 4 — Room detail page with image carousel screenshot  
> *(Screenshot to be inserted here)*

> **Figure 56:** Sprint 4 — Booking form page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 57:** Sprint 4 — eSewa payment gateway redirect screenshot  
> *(Screenshot to be inserted here)*

> **Figure 58:** Sprint 4 — Payment success page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 59:** Sprint 4 — Tenant bookings page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 60:** Sprint 4 — Tenant tracking page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 61:** Sprint 4 — Tenant messages / chat page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 62:** Sprint 4 — Landlord list property page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 63:** Sprint 4 — Landlord dashboard overview tab screenshot  
> *(Screenshot to be inserted here)*

> **Figure 64:** Sprint 4 — Landlord dashboard tenants tab (renew/vacate) screenshot  
> *(Screenshot to be inserted here)*

> **Figure 65:** Sprint 4 — Landlord dashboard bookings confirmation screenshot  
> *(Screenshot to be inserted here)*

> **Figure 66:** Sprint 4 — Landlord chat inbox screenshot  
> *(Screenshot to be inserted here)*

> **Figure 67:** Sprint 4 — Admin login page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 68:** Sprint 4 — Admin analytics dashboard screenshot  
> *(Screenshot to be inserted here)*

> **Figure 69:** Sprint 4 — Admin user management page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 70:** Sprint 4 — Admin room deactivation with reason screenshot  
> *(Screenshot to be inserted here)*

> **Figure 71:** Sprint 4 — Admin payments page screenshot  
> *(Screenshot to be inserted here)*

---

### 3.12.3.2. Backend
- `GET/POST /api/v1/rooms/` — Create and list room listings
- `GET /api/v1/rooms/{id}` — Fetch single room details
- `GET /api/v1/rooms/search` — Search with filters: city, type, min/max price, amenities, furnishing, radius
- `POST /api/v1/bookings/rooms/{id}/book` — Create booking record
- `POST /api/v1/bookings/payment/initiate` — Generate eSewa payment signature and parameters
- `POST /api/v1/bookings/payment/verify` — Decode eSewa callback, verify HMAC signature, activate booking
- `POST /api/v1/bookings/payment/cancel` — Cancel booking and free room on payment failure
- `POST /api/v1/bookings/{id}/manual-verify` — Landlord manually confirms payment receipt
- `POST /api/v1/bookings/rooms/{id}/vacate-tenant` — Landlord forcibly vacates current tenant
- `POST /api/v1/bookings/rooms/{id}/expire-tenant` — Free room after tenancy has expired
- `GET /api/v1/messages/{room_id}` — Fetch chat messages for a room
- `POST /api/v1/messages/{room_id}` — Send a chat message
- `GET/POST /api/v1/admin/users` — Admin user management
- `POST /api/v1/admin/rooms/{id}/deactivate` — Admin deactivation with reason
- `GET /api/v1/admin/analytics` — Platform-wide analytics data
- `GET /api/v1/admin/payments` — All payment records

> **Figure 72:** Sprint 4 — Backend API endpoints overview (FastAPI docs) screenshot  
> *(Screenshot to be inserted here)*

> **Figure 73:** Sprint 4 — eSewa payment signature generation backend screenshot  
> *(Screenshot to be inserted here)*

> **Figure 74:** Sprint 4 — Booking activation backend logic screenshot  
> *(Screenshot to be inserted here)*

---

## 3.12.4. Velocity Chart

> **Figure 75:** Velocity Chart — Sprint 4  
> *(Chart to be inserted here)*

---

## 3.12.5. Burn-Down Chart

> **Figure 76:** Burn-Down Chart — Sprint 4  
> *(Chart to be inserted here)*

---
---

# 3.13. Sprint 5 — Data and AI Intelligence

**Sprint Name:** Data and AI Intelligence  
**Duration:** March 11, 2026 – March 26, 2026

---

## 3.13.1. Sprint Planning

This sprint focused on platform intelligence, data organisation, and analytics. The work included implementing systematic database optimisation (indexes, query improvements), enriching the admin analytics dashboard with monthly revenue charts and top landlord reporting, adding tenant payment tracking and history, and implementing recommendation logic for room suggestions based on search history and user preferences. Data export capabilities were also explored. This sprint added depth and analytical value to the platform's existing functionality.

### Sprint 5 — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US25 | As an admin, I want to view platform-wide analytics with charts and revenue reporting. | 13 |
| US26 | As an admin, I want to view and filter all payment records. | 8 |
| US12 | As a tenant, I want to track my tenancy with progress bar and next rent date. | 8 |
| US29 | As the system, I want to lock rooms after booking and free after tenancy expiry. | 8 |

**Table 18: Sprint 5 — Backlogs**

**Total Story Points Planned:** 37  
**Total Story Points Completed:** 37

---

## 3.13.2. Design

### 3.13.2.1. High-Level Use Cases

**UC013 – Admin Analytics Dashboard**

| Field | Description |
|---|---|
| Use Case ID | UC013 |
| Use Case Name | Admin Analytics Dashboard |
| Actor(s) | Admin |
| Description | The admin analytics dashboard aggregates data from all platform models to generate meaningful statistics. It displays bar charts for user registrations per month and bookings per month, donut charts for user type distribution, room status distribution, and booking status distribution, and a monthly revenue line/bar chart. The top 5 landlords by income are listed. All charts are populated dynamically from the database via analytics API endpoints. |

**Table 19: High-Level Use Case — UC013 – Admin Analytics**

---

**UC014 – Tenant Tenancy Tracking**

| Field | Description |
|---|---|
| Use Case ID | UC014 |
| Use Case Name | Tenant Tenancy Tracking |
| Actor(s) | Tenant |
| Description | A tenant with an active booking can view their tenancy on the tracking page. The page shows the room title, landlord name, tenancy start and end dates, a progress bar indicating percentage of stay completed, a colour-coded next rent due banner (green = on time, amber = approaching, red = overdue), and a full payment history accordion. The tenant can initiate a voluntary vacate via a modal with a reason field. |

**Table 20: High-Level Use Case — UC014 – Tenancy Tracking**

---

### 3.13.2.2. Activity Diagram

> **Figure 77:** Activity Diagram — Admin Analytics Data Flow  
> *(Screenshot / Diagram to be inserted here)*

> **Figure 78:** Activity Diagram — Tenant Tracking and Rent Due Alerts  
> *(Screenshot / Diagram to be inserted here)*

---

### 3.13.2.3. Sequence Diagram

> **Figure 79:** Sequence Diagram — Admin Loads Analytics Dashboard  
> *(Diagram to be inserted here)*

> **Figure 80:** Sequence Diagram — Tenant Views Tracking Page  
> *(Diagram to be inserted here)*

---

### 3.13.2.4. Wireframe

> **Figure 81:** Wireframe — Admin Analytics Dashboard  
> *(Screenshot to be inserted here)*

> **Figure 82:** Wireframe — Tenant Tracking Page  
> *(Screenshot to be inserted here)*

---

## 3.13.3. Development

### 3.13.3.1. Frontend
- Analytics charts rendered using SVG/Canvas chart components (bar, donut, line)
- Monthly revenue chart with 6-month window
- Tenant tracking progress bar with dynamic colour coding
- Payment history accordion on tracking page
- Top landlords leaderboard in admin analytics

> **Figure 83:** Sprint 5 — Admin analytics dashboard with charts screenshot  
> *(Screenshot to be inserted here)*

> **Figure 84:** Sprint 5 — Tenant tracking page with progress bar screenshot  
> *(Screenshot to be inserted here)*

> **Figure 85:** Sprint 5 — Payment history on tracking page screenshot  
> *(Screenshot to be inserted here)*

---

### 3.13.3.2. Backend
- `GET /api/v1/admin/analytics` — Monthly user/booking/revenue aggregation queries
- Database index optimisation on `rooms.status`, `bookings.tenant_id`, `payments.created_at`
- `GET /api/v1/tenant/tracking` — Returns active tenancy details with computed days remaining and progress
- Monthly revenue grouping logic using PostgreSQL date_trunc queries

> **Figure 86:** Sprint 5 — Analytics API response and data aggregation screenshot  
> *(Screenshot to be inserted here)*

> **Figure 87:** Sprint 5 — Database optimisation and query performance screenshot  
> *(Screenshot to be inserted here)*

---

## 3.13.4. Velocity Chart

> **Figure 88:** Velocity Chart — Sprint 5  
> *(Chart to be inserted here)*

---

## 3.13.5. Burn-Down Chart

> **Figure 89:** Burn-Down Chart — Sprint 5  
> *(Chart to be inserted here)*

---
---

# 3.14. Testing Sprint

**Sprint Name:** Unit and Integration Testing  
**Duration:** April 20, 2026 – April 22, 2026

---

## 3.14.1. Sprint Planning

This sprint was dedicated entirely to testing the RoomBox backend and frontend. Unit tests were written using Python's `pytest` framework to validate 30 distinct areas of backend business logic. Integration testing verified the complete end-to-end flows including registration → email verification → login, booking → payment → activation, and admin deactivation → landlord lock. All tests were run and verified to pass before the deployment sprint.

### Testing Sprint — Backlogs

| ID | User Story | Story Points |
|---|---|---|
| US1 | Unit tests for email validation, password hashing, JWT authentication. | 5 |
| US10 | Unit tests for eSewa signature generation and verification. | 5 |
| US9 | Unit tests for booking creation, duplicate prevention, status transitions. | 5 |
| US2 | Integration test for full login and registration flow. | 3 |

**Table 21: Testing Sprint — Backlogs**

**Total Story Points Planned:** 18  
**Total Story Points Completed:** 18

---

## 3.14.2. Unit Testing Summary

A total of **30 unit test classes** with **128 individual assertions** were written in `backend/tests/test_unit.py`. All tests passed. Key areas covered:

| Test Range | Area Covered |
|---|---|
| UT001 – UT004 | Email validation, password hashing, OTP generation and expiry |
| UT005 – UT006 | JWT token signing, decoding, and tamper detection |
| UT007 – UT008 | Booking amount calculation, room status transitions |
| UT009 – UT011 | Tenancy duration, image array validation, required field checks |
| UT012 – UT014 | eSewa signature generation and verification |
| UT015 – UT017 | Double booking prevention, admin lock, room vacancy logic |
| UT018 – UT020 | Booking status transitions, email configuration, duplicate user detection |
| UT021 – UT024 | Search price filtering, tenancy progress, phone validation, user role checks |
| UT025 – UT027 | Occupied room deactivation block, revenue grouping, admin self-deletion block |
| UT028 – UT030 | Image array constraints, admin deletion safeguards, reset token reuse prevention |

**Table 22: Unit Testing Coverage Summary**

> **Figure 90:** Unit testing execution summary — all 128 tests passed  
> *(Screenshot to be inserted here)*

> **Figure 91:** Unit test code sample — eSewa signature verification  
> *(Screenshot to be inserted here)*

> **Figure 92:** Unit test code sample — JWT token handling  
> *(Screenshot to be inserted here)*

---

## 3.14.3. Manual Testing Summary

A total of **25 manual test cases** (MT001 – MT025) were executed by a human tester navigating the application in a web browser. All 25 tests passed.

| Range | Feature Area |
|---|---|
| MT001 – MT006 | Registration, Email Verification, Login, Forgot/Reset Password |
| MT007 – MT013 | Tenant Search, Room Detail, Booking, Payment, Bookings, Tracking, Chat |
| MT014 – MT018 | Landlord Dashboard, Listings, Tenant Management, Chat Inbox |
| MT019 – MT023 | Admin Login, Users, Rooms, Analytics, Payments |
| MT024 – MT025 | Mobile Responsive Design, Logout |

**Table 23: Manual Testing Coverage Summary**

> **Figure 93:** Manual test MT003 — Login page screenshot  
> *(Screenshot to be inserted here)*

> **Figure 94:** Manual test MT010 — eSewa payment gateway screenshot  
> *(Screenshot to be inserted here)*

> **Figure 95:** Manual test MT021 — Admin room deactivation with reason screenshot  
> *(Screenshot to be inserted here)*

---

## 3.14.4. Velocity Chart

> **Figure 96:** Velocity Chart — Testing Sprint  
> *(Chart to be inserted here)*

---
---

# 3.15. Closure Sprint

**Sprint Name:** Deployment and Finalisation  
**Duration:** April 27, 2026 – April 30, 2026

---

## 3.15.1. Sprint Planning

The final sprint covered deployment preparation, project finalisation, and documentation. The backend was verified to run correctly with `uvicorn`, the frontend was built with `npm run build`, and the application was confirmed operational end-to-end. Final documentation was compiled including this report, the unit test report, the manual test report, and the product backlog document.

### Closure Sprint — Backlogs

| ID | Task | Story Points |
|---|---|---|
| CL1 | Deployment and monitoring setup | 5 |
| CL2 | Finalisation of project | 3 |
| CL3 | Final documentation compilation | 5 |
| CL4 | Final review and retrospective | 3 |

**Table 24: Closure Sprint — Backlogs**

**Total Story Points Planned:** 16  
**Total Story Points Completed:** 16

---

## 3.15.2. Deployment

### 3.15.2.1. Backend Deployment
- FastAPI backend started via `uvicorn app.main:app --reload --port 8000`
- PostgreSQL 17 running on `localhost:5432`
- Environment variables configured in `.env` for database, JWT secret, email, and eSewa credentials
- All Alembic migrations applied successfully

### 3.15.2.2. Frontend Deployment
- Next.js frontend started via `npm run dev` on `localhost:3000`
- All environment variables configured for API base URL
- Build verified with `npm run build` — no errors

> **Figure 97:** Closure — Backend server running successfully screenshot  
> *(Screenshot to be inserted here)*

> **Figure 98:** Closure — Frontend application running on localhost:3000 screenshot  
> *(Screenshot to be inserted here)*

> **Figure 99:** Closure — Full application end-to-end test flow screenshot  
> *(Screenshot to be inserted here)*

---

## 3.15.3. Sprint Velocity Summary

| Sprint | Planned Points | Completed Points | Velocity |
|---|---|---|---|
| Sprint 1 — Planning & Analysis | 10 | 10 | 100% |
| Sprint 2 — System Architecture | 21 | 21 | 100% |
| Sprint 3 — Core Authentication | 16 | 16 | 100% |
| Sprint 4 — Full-Stack Development | 177 | 177 | 100% |
| Sprint 5 — Data & AI Intelligence | 37 | 37 | 100% |
| Testing Sprint | 18 | 18 | 100% |
| Closure Sprint | 16 | 16 | 100% |
| **Total** | **295** | **295** | **100%** |

**Table 25: Overall Sprint Velocity Summary**

> **Figure 100:** Overall Velocity Chart — All Sprints  
> *(Chart to be inserted here)*

> **Figure 101:** Overall Burn-Down Chart — Full Project  
> *(Chart to be inserted here)*

---

## 3.15.4. Retrospective

### What Went Well
- The eSewa payment integration was successfully implemented and verified with real test payments
- The JWT authentication system with email verification provides robust security
- The landlord dashboard evolved into a comprehensive management tool covering listings, tenants, bookings, income, and chat in a single interface
- All 128 unit tests passed after fixing a critical `PyJWT` exception handling bug discovered during testing

### Challenges
- eSewa callback URL parsing required careful debugging due to base64-encoded response parameters
- Chat functionality was initially implemented with Socket.IO but was refactored to HTTP polling for reliability
- Search filter stale closures in React required careful use of `useCallback` and separate draft/applied filter states

### Lessons Learned
- Saving payment and booking IDs to `localStorage` before eSewa redirect prevents data loss on URL parameter corruption
- HTTP polling is a more reliable approach than WebSockets for chat in a resource-constrained local environment
- Separating admin authentication from user authentication significantly simplifies role-based access control

---

*RoomBox Sprint-Wise Development Report — Prepared April 2026*
