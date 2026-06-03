import * as React from 'react';
import { Button } from '@react-email/components';
import { EmailLayout, styles, Text } from './layout';

export function PasswordResetEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return (
    <EmailLayout preview="Reset your DdotsMediaJobs password">
      <Text style={styles.h1}>Reset your password</Text>
      <Text style={styles.p}>Hi {name},</Text>
      <Text style={styles.p}>
        We received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.
      </Text>
      <Button href={resetUrl} style={styles.button}>
        Reset Password
      </Button>
      <Text style={{ ...styles.p, marginTop: 24 }}>
        If you didn't request this, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
