import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { GroupsDirectory } from './groups-directory';

export const metadata: Metadata = {
  title: 'UAE Job WhatsApp Groups — 76 Professional Communities',
  description: 'Join 76 professional WhatsApp groups for UAE jobs by category. 120,000+ members. Daily job postings, hires tracked, free.',
  alternates: { canonical: `${SITE.url}/whatsapp-groups` },
};

export default function WhatsappGroupsPage() {
  return (
    <div className="bg-navy-50/30">
      <GroupsDirectory />
    </div>
  );
}
