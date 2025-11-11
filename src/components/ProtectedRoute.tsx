import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * ProtectedRoute component that redirects to login if user is not authenticated
 * Wrap your protected screens with this component
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === 'screens' && segments[1] === 'login';

    if (!user && !inAuthGroup) {
      // Show login modal if not authenticated
      router.push('/screens/login');
    } else if (user && inAuthGroup) {
      // Close modal if authenticated and on login page
      router.back();
    }
  }, [user, loading, initialized, segments]);

  if (!initialized || loading) {
    return null; // Or return a loading spinner
  }

  return <>{children}</>;
}

