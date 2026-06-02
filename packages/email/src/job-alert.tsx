import * as React from 'react';
import { Section, Hr } from '@react-email/components';
import { EmailLayout, styles, Text } from './layout';

type AlertJob = { title: string; companyName: string; location: string; salary: string; url: string };

export function JobAlertEmail({ name, jobs }: { name: string; jobs: AlertJob[] }) {
  return (
    <EmailLayout preview={`${jobs.length} new jobs match your alert`}>
      <Text style={styles.h1}>{jobs.length} new jobs for you 🔔</Text>
      <Text style={styles.p}>Hi {name}, here are the latest jobs matching your alert:</Text>
      {jobs.map((job, i) => (
        <Section key={i} style={{ marginBottom: 12 }}>
          <a href={job.url} style={{ color: styles.navy, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            {job.title}
          </a>
          <Text style={{ ...styles.p, margin: '4px 0 0' }}>
            {job.companyName} · {job.location}
          </Text>
          <Text style={{ color: styles.teal, fontSize: 14, fontWeight: 600, margin: '2px 0 0' }}>{job.salary}</Text>
          {i < jobs.length - 1 && <Hr style={{ borderColor: '#e2e8f0', margin: '12px 0 0' }} />}
        </Section>
      ))}
      <Text style={{ ...styles.p, marginTop: 20 }}>
        <a href="https://ddotsmediajobs.com/dashboard/alerts" style={{ color: styles.teal }}>
          Manage your job alerts
        </a>
      </Text>
    </EmailLayout>
  );
}

export default JobAlertEmail;
