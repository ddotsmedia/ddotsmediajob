/** Curated salaried roles for the /salaries index + slug↔title mapping (Phase 6B). */
export const SALARY_ROLES: { slug: string; name: string }[] = [
  { slug: 'software-engineer', name: 'Software Engineer' },
  { slug: 'accountant', name: 'Accountant' },
  { slug: 'sales-executive', name: 'Sales Executive' },
  { slug: 'marketing-manager', name: 'Marketing Manager' },
  { slug: 'civil-engineer', name: 'Civil Engineer' },
  { slug: 'nurse', name: 'Nurse' },
  { slug: 'hr-manager', name: 'HR Manager' },
  { slug: 'graphic-designer', name: 'Graphic Designer' },
  { slug: 'project-manager', name: 'Project Manager' },
  { slug: 'receptionist', name: 'Receptionist' },
  { slug: 'driver', name: 'Driver' },
  { slug: 'teacher', name: 'Teacher' },
  { slug: 'electrician', name: 'Electrician' },
  { slug: 'chef', name: 'Chef' },
  { slug: 'data-analyst', name: 'Data Analyst' },
  { slug: 'customer-service', name: 'Customer Service' },
];

/** slug "software-engineer" → normalized title "software_engineer" (matches salary-normalizer). */
export const slugToNormalized = (slug: string) => slug.replace(/-/g, '_');
export const roleNameFromSlug = (slug: string) =>
  SALARY_ROLES.find((r) => r.slug === slug)?.name ??
  slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
