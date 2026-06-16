import { redirect } from 'next/navigation';

// Pricing removed — every feature is free. Old links land on post-a-job.
export default function PricingPage() {
  redirect('/employer/post');
}
