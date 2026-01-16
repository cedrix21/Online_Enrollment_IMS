# SICS Online Enrollment System í¾“

This is the Capstone Project for the SICS Online Enrollment System. It is a monorepo containing both the frontend and backend applications.

---

## í³‚ Project Structure
- **/frontend**: React.js application (Student & Admin UI).
- **/backend**: Laravel 11 API (Database, Auth, & Business Logic).

## í»  Tech Stack
- **Frontend:** React, Axios, React Router.
- **Backend:** Laravel 11, MySQL, Laravel Sanctum.
- **Theme:** Custom SICS Gold & Cream Palette.

---

## íº€ Installation & Setup

### 1. Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Update your .env with your MySQL database details, then:
php artisan migrate --seed
php artisan serve
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm start
```

---

## í´‘ Default Roles
The system supports the following roles:
- **Admin:** Full system management.
- **Registrar:** Enrollment and student record handling.
- **Teacher:** Schedule and load slip management.

---
*Developed for the CAPSTONE PROJECT 2026.*
