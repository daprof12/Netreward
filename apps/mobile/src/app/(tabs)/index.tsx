import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import UserHomeScreen from '@/screens/UserHomeScreen';
import SpDashboardScreen from '@/screens/SpDashboardScreen';
import IspDashboardScreen from '@/screens/IspDashboardScreen';

export default function TabIndexScreen() {
  const { role } = useAuthStore();

  if (role === 'sp') return <SpDashboardScreen />;
  if (role === 'isp') return <IspDashboardScreen />;
  return <UserHomeScreen />;
}
