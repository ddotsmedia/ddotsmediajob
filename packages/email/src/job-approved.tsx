import * as React from 'react';
import { Button } from '@react-email/components';
import { EmailLayout, styles, Text } from './layout';

export function JobApprovedEmail({ name, jobTitle, jobUrl }: { name: string; jobTitle: string; jobUrl: string }) {
  return (
    <EmailLayout preview={`Your job is live: ${jobTitle}`}>
      <Text style={styles.h1}>Your job is live 🚀</Text>
      <Text style={styles.p}>Hi {name},</Text>
      <Text style={styles.p}>
        Good news — <strong>{jobTitle}</strong> has been approved and is now visible to jobseekers across the UAE.
      </Text>
      <Button href={jobUrl} style={styles.button}>
        View Your Listing
      </Button>
    </EmailLayout>
  );
}

export default JobApprovedEmail;
