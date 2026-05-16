/**
 * Kaamlink AI Service Orchestrator — Phase 1 & 2
 * 5-screen flow: Home → Pricing → Bids → Confirmed → Recovery
 * All 7 agents visible with live traces.
 */
import React, { useState } from 'react';
import HomeScreen from '../../screens/HomeScreen';
import PricingScreen from '../../screens/PricingScreen';
import BidsScreen from '../../screens/BidsScreen';
import ConfirmedScreen from '../../screens/ConfirmedScreen';
import RecoveryScreen from '../../screens/RecoveryScreen';

type Screen = 'home' | 'pricing' | 'bids' | 'confirmed' | 'recovery';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [flowData, setFlowData] = useState<any>({});

  const go = (to: Screen, extra?: any) => {
    if (extra) setFlowData((prev: any) => ({ ...prev, ...extra }));
    setScreen(to);
  };

  const restart = () => { setFlowData({}); setScreen('home'); };

  if (screen === 'home')
    return <HomeScreen onNext={d => go('pricing', d)} />;
  if (screen === 'pricing')
    return <PricingScreen data={flowData} onNext={d => go('bids', d)} onBack={() => setScreen('home')} />;
  if (screen === 'bids')
    return <BidsScreen data={flowData} onNext={d => go('confirmed', d)} onBack={() => setScreen('pricing')} />;
  if (screen === 'confirmed')
    return <ConfirmedScreen data={flowData} onSimulateCancel={() => setScreen('recovery')} onRestart={restart} />;
  if (screen === 'recovery')
    return <RecoveryScreen data={flowData} onRestart={restart} />;

  return null;
}
