import { redirect } from 'next/navigation';

/** Canonical CV search lives at /employer/candidates — this path is an alias. */
export default function CvSearchAlias() {
  redirect('/employer/candidates');
}
