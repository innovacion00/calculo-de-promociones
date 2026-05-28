'use client';

import { usePrepurchase } from '@/context/PrepurchaseContext';
import FileUpload from '@/components/FileUpload';
import AppShell from '@/components/AppShell';

export default function Home() {
  const { rawRows } = usePrepurchase();

  if (rawRows.length === 0) {
    return <FileUpload />;
  }

  return <AppShell />;
}
