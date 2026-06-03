import * as React from 'react';
import { Button } from '@react-email/components';
import { EmailLayout, styles, Text } from './layout';

export function VerifyEmail({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return (
    <EmailLayout preview="Verify your email — DdotsMediaJobs">
      <Text style={styles.h1}>Verify your email</Text>
      <Text style={styles.p}>Hi {name},</Text>
      <Text style={styles.p}>Confirm your email address to activate your DdotsMediaJobs account.</Text>
      <Button href={verifyUrl} style={styles.button}>
        Verify Email
      </Button>
      <Text style={{ ...styles.p, marginTop: 24 }}>This link expires in 24 hours.</Text>
    </EmailLayout>
  );
}

export default VerifyEmail;
