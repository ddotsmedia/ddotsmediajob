import * as React from 'react';
import { EmailLayout, styles, Text } from './layout';

export function ApplyConfirmationEmail({
  name,
  jobTitle,
  companyName,
}: {
  name: string;
  jobTitle: string;
  companyName: string;
}) {
  return (
    <EmailLayout preview={`Application sent: ${jobTitle}`}>
      <Text style={styles.h1}>Application sent ✅</Text>
      <Text style={styles.p}>Hi {name},</Text>
      <Text style={styles.p}>
        Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been submitted. The
        employer can now review your profile.
      </Text>
      <Text style={styles.p}>
        Track all your applications anytime from your{' '}
        <a href="https://ddotsmediajobs.com/dashboard/applications" style={{ color: styles.teal }}>
          dashboard
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

export default ApplyConfirmationEmail;
