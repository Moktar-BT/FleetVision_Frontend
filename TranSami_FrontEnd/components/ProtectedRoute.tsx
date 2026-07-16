'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './Loading';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Vérifier les tokens dans localStorage ET sessionStorage
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) {
      router.replace('/');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return <Loading fullScreen={true} text="Vérification de l'authentification..." />;
  }

  return <>{children}</>;
}