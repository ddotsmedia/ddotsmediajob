import * as React from 'react';
import { Button } from '@react-email/components';
import { EmailLayout, styles, Text } from './layout';

export function WelcomeEmail({ name, role }: { name: string; role: 'jobseeker' | 'employer' }) {
  const isEmployer = role === 'employer';
  return (
    <EmailLayout preview="Welcome to DdotsMediaJobs">
      <Text style={styles.h1}>Welcome, {name} 👋</Text>
      <Text style={styles.p}>
        Your DdotsMediaJobs account is ready. {isEmployer
          ? 'Post your first job in minutes and reach thousands of UAE jobseekers.'
          : 'Discover thousands of jobs across the UAE and apply in one click.'}
      </Text>
      <Button href={isEmployer ? 'https://ddotsmediajobs.com/employer/post' : 'https://ddotsmediajobs.com/jobs'} style={styles.button}>
        {isEmployer ? 'Post a Job' : 'Browse Jobs'}
      </Button>
      <Text style={{ ...styles.p, marginTop: 24 }}>
        Need help? Just reply to this email — we read every message.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
