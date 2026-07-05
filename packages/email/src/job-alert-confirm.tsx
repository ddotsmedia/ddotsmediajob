import * as React from 'react';
import { EmailLayout, styles, Text } from './layout';

export function JobAlertConfirmEmail({
  keywords,
  emirate,
  unsubscribeUrl,
}: {
  keywords: string | null;
  emirate: string | null;
  unsubscribeUrl: string;
}) {
  const what = keywords ? `“${keywords}”` : 'new jobs';
  const where = emirate ? ` in ${emirate}` : ' across the UAE';
  return (
    <EmailLayout preview="Your job alerts are activated">
      <Text style={styles.h1}>Job alerts activated 🔔</Text>
      <Text style={styles.p}>
        You&apos;re all set. We&apos;ll email you when {what}{where} are posted on DdotsMediaJobs.
      </Text>
      <Text style={{ ...styles.p, marginTop: 20 }}>
        Changed your mind?{' '}
        <a href={unsubscribeUrl} style={{ color: styles.teal }}>
          Unsubscribe
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

export default JobAlertConfirmEmail;
