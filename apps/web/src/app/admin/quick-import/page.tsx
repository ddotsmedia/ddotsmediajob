import { Suspense } from 'react';
import { QuickImportForm } from './quick-import-form';

export default function QuickImportPage() {
  return (
    <Suspense fallback={null}>
      <QuickImportForm />
    </Suspense>
  );
}
