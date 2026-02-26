import heroBg from '@/assets/hero-bg.jpg';

export interface PageMeta {
  title: string;
  description: string;
  image: string;
}

/**
 * Static metadata for each of the top–level pages.  The values here are
 * intentionally simple (re‑using the existing hero background) but they can
 * be expanded to include page‑specific pictures or more detailed description
 * text.  This file acts as the single source of truth for "static adata" (as
 * requested) which consumers on individual pages can import and apply with
 * the `usePageMeta` hook.
 */
export const pageMeta: Record<string, PageMeta> = {
  Landing: {
    title: 'जनवाणी — Your Voice, Our Action',
    description:
      'AI-powered urban grievance platform connecting citizens directly with municipal authorities.',
    image: heroBg,
  },
  Index: {
    title: 'Janvani',
    description: 'Welcome to JANVANI - a civic issue reporting system.',
    image: heroBg,
  },
  NotFound: {
    title: 'Page Not Found',
    description: "Sorry, we couldn't find that page.",
    image: heroBg,
  },
  CitizenLogin: {
    title: 'Citizen Login – Janvani',
    description: 'Sign in to the citizen portal to report and track issues.',
    image: heroBg,
  },
  CitizenDashboard: {
    title: 'Citizen Dashboard – Janvani',
    description: 'Overview of your complaints, points and activity.',
    image: heroBg,
  },
  CitizenReport: {
    title: 'Report a Problem – Janvani',
    description: 'Submit a new civic grievance with photo and location.',
    image: heroBg,
  },
  CitizenTrack: {
    title: 'Track Complaint – Janvani',
    description: "Follow the status of your submitted issues.",
    image: heroBg,
  },
  CitizenLeaderboard: {
    title: 'Leaderboard – Janvani',
    description: 'See the top contributors in your city.',
    image: heroBg,
  },
  CitizenRewards: {
    title: 'Rewards – Janvani',
    description: 'Your earned points and badges.',
    image: heroBg,
  },
  CitizenSOS: {
    title: 'SOS – Janvani',
    description: 'Request immediate assistance for urgent problems.',
    image: heroBg,
  },
  CitizenFeedback: {
    title: 'Feedback – Janvani',
    description: 'Provide feedback on resolved complaints.',
    image: heroBg,
  },
  AdminLogin: {
    title: 'Admin Login – Janvani',
    description: 'Sign in to the admin portal.',
    image: heroBg,
  },
  AdminDashboard: {
    title: 'Admin Dashboard – Janvani',
    description: 'Manage complaints and view analytics.',
    image: heroBg,
  },
  AdminComplaints: {
    title: 'Complaints – Admin',
    description: 'Browse and filter incoming issues.',
    image: heroBg,
  },
  AdminResolve: {
    title: 'Resolve Complaint – Admin',
    description: 'Change status and add notes to a complaint.',
    image: heroBg,
  },
  AdminSettings: {
    title: 'Settings – Admin',
    description: 'Configure the Janvani application.',
    image: heroBg,
  },
};
