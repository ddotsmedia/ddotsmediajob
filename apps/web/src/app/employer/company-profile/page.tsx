import { redirect } from 'next/navigation';

/** Canonical company profile editor lives at /employer/profile — this path is an alias. */
export default function CompanyProfileAlias() {
  redirect('/employer/profile');
}
