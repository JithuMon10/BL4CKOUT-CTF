# 🏴‍☠️ BL4CKOUT CTF Platform

A modern, highly performant Capture The Flag (CTF) competition platform built with **Next.js 16**, **Tailwind CSS**, and **Supabase**. Designed to provide a seamless and visually stunning experience for both players and event organizers.

![BL4CKOUT Screenshot](https://raw.githubusercontent.com/JithuMon10/BL4CKOUT-CTF/main/public/logo.png) <!-- Update with actual screenshot link if available -->

## ✨ Features

### 🛡️ For Players
- **Dynamic Challenges**: Solve web, forensics, crypto, pwn, reverse, and misc challenges to find hidden flags (`BL4CKOUT{...}`).
- **Team Management**: 
  - Create or join teams using unique invite codes (e.g. `BLK-XXXXXX`).
  - **4-Member Capacity**: Enforced maximum of 4 members per team.
  - **Captain Controls**: Team captains can kick members, transfer leadership, or disband the team.
- **Live Scoreboard**: Real-time leaderboard tracking total team points and solve times.
- **Progress Tracking**: See your team's solved challenges and earned points at a glance.

### 🛠️ For Organizers (Admin Panel)
- **Challenge Management**: Create, edit, and delete challenges. Upload challenge files directly to cloud storage.
- **Announcements**: Broadcast live announcements to all participants.
- **User & Team Management**: View and manage all registered users and teams.
- **Submission Logs**: Real-time auditing of every flag submission attempt (both correct and incorrect).
- **Global Settings**: Update competition name, freeze/unfreeze the scoreboard, and toggle platform visibility.

---

## 💻 Tech Stack

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Dark Mode UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security)
- **Hosting**: [Vercel](https://vercel.com/) (Serverless Edge Functions)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine. You will also need a [Supabase](https://supabase.com) project for the database and authentication.

### 1. Clone the repository
```bash
git clone https://github.com/JithuMon10/BL4CKOUT-CTF.git
cd BL4CKOUT-CTF
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root of your project and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Database Setup
Run the SQL script provided in `schema.sql` within your Supabase project's SQL Editor. This will set up the necessary tables, Row Level Security (RLS) policies, and storage buckets.

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the platform in action.

---

## 🛡️ Security

- **Server-Side Validation**: Flags are validated via secure serverless API routes (`/api/challenges/submit`), ensuring raw flags are never exposed to the client.
- **Row Level Security (RLS)**: PostgreSQL policies restrict write access to admins and prevent unauthorized access to sensitive data.
- **Column-Level Revocation**: `REVOKE SELECT (flag) ON public.challenges FROM anon, authenticated;` prevents any client-side extraction of flags.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
