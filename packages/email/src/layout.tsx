import * as React from 'react';
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components';

const TEAL = '#339a9b';
const NAVY = '#0d2e2d';

export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' }}>
          <Section style={{ backgroundColor: NAVY, padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 700, margin: 0 }}>
              <span style={{ color: TEAL }}>Ddots</span>MediaJobs
            </Text>
          </Section>
          <Section style={{ padding: '32px' }}>{children}</Section>
          <Hr style={{ borderColor: '#e2e8f0', margin: 0 }} />
          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
              DdotsMediaJobs · UAE Job Portal · <Link href="https://ddotsmediajobs.com" style={{ color: TEAL }}>ddotsmediajobs.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const styles = {
  teal: TEAL,
  navy: NAVY,
  h1: { color: NAVY, fontSize: 22, fontWeight: 700, margin: '0 0 16px' } as React.CSSProperties,
  p: { color: '#334155', fontSize: 15, lineHeight: '24px', margin: '0 0 16px' } as React.CSSProperties,
  button: {
    backgroundColor: TEAL,
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 15,
    display: 'inline-block',
  } as React.CSSProperties,
};

export { Heading, Text, Section, Link, Hr };
