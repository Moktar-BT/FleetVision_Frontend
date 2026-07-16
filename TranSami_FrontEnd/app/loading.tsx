'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';

export default function LoadingPage() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 8500); 

    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return <div>✅ Page chargée</div>; // remplace par ton vrai contenu
  }

  return <Loading fullScreen={true} text="Loading..." />;
}