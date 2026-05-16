import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, API_BASE } from '../constants/kaamlink';
import { NavHeader, Avatar, AgentStepRow, PulsingDot } from '../components/KaamilinkUI';

export default function BidsScreen({ data, onNext, onBack }: { data: any; onNext: (d: any) => void; onBack: () => void }) {
  const { intent, providers, pricing, userBudget } = data;
  const [bids, setBids] = useState<any[]>([]);
  const [shown, setShown] = useState(0);
  const [secs, setSecs] = useState(120);
  const slideAnims = useRef([0, 1, 2].map(() => new Animated.Value(60))).current;
  const fadeAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    fetch(`${API_BASE}/api/bids`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers, urgency: intent.urgency, user_budget: userBudget }) })
      .then(r => r.json()).then(d => {
        setBids(d.bids || []);
        [0, 1, 2].forEach(i => setTimeout(() => {
          setShown(prev => prev + 1);
          Animated.parallel([
            Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
            Animated.timing(fadeAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
        }, 1500 * (i + 1)));
      }).catch(() => {});
  }, []);

  useEffect(() => { const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <SafeAreaView style={s.root}>
      <NavHeader title="Live Bids" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View style={s.statusBar}>
          <View style={s.liveRow}><PulsingDot color={C.green} /><Text style={s.liveTxt}> LIVE</Text></View>
          <Text style={s.timer}>{mm}:{ss}</Text>
        </View>

        <View style={s.contextCard}>
          <Text style={s.contextService}>{intent.service} · {intent.location}</Text>
          <Text style={s.contextBudget}>Your offer: PKR {userBudget?.toLocaleString() || pricing?.suggested_offer?.toLocaleString() || 'open'}</Text>
        </View>

        <View style={s.agentCard}>
          <AgentStepRow title="[6] RADIUS EXPANSION AGENT" desc={shown > 0 ? `${shown} bid${shown > 1 ? 's' : ''} received — expanding search if needed` : 'Contacting nearby providers...'} status={shown > 0 ? 'done' : 'running'} />
          <AgentStepRow title="[BID SIMULATION AGENT]" desc={shown >= 3 ? 'All bids ranked · Best Value identified' : `Waiting for bids... (${shown}/3)`} status={shown >= 3 ? 'done' : shown > 0 ? 'running' : 'waiting'} />
        </View>

        {shown === 0 && (
          <View style={s.waitBox}><PulsingDot color={C.blue} /><Text style={s.waitTxt}>  Waiting for providers to respond...</Text></View>
        )}

        {bids.slice(0, shown).map((bid, i) => (
          <Animated.View key={bid.id} style={[s.bidCard, i === 0 && s.bidCardTop, { transform: [{ translateY: slideAnims[i] }], opacity: fadeAnims[i] }]}>
            {i === 0 && shown >= 3 && <View style={s.bestBadge}><Ionicons name="trophy" size={11} color={C.amber} /><Text style={s.bestTxt}> BEST VALUE</Text></View>}
            <View style={s.bidHeader}>
              <Avatar name={bid.provider_name} color={i === 0 ? C.blue : C.purple} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.bidName}>{bid.provider_name}</Text>
                <View style={s.etaRow}><Ionicons name="location" size={11} color={C.textMuted} /><Text style={s.etaTxt}> {bid.eta_mins} min away</Text></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.bidAmount, i === 0 && { color: C.blue }]}>PKR {bid.amount?.toLocaleString()}</Text>
                <Text style={s.expiryTxt}>2 min left</Text>
              </View>
            </View>
            <TouchableOpacity style={[s.acceptBtn, i === 0 && s.acceptBtnPrimary]} onPress={() => onNext({ ...data, selectedBid: bid })}>
              <Text style={s.acceptTxt}>{i === 0 ? '⚡ Accept Best Bid' : 'Accept Bid'}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  liveRow: { flexDirection: 'row', alignItems: 'center' },
  liveTxt: { color: C.green, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  timer: { color: C.text, fontWeight: '800', fontSize: 22 },
  contextCard: { backgroundColor: C.blueGlow, borderRadius: 14, borderWidth: 1, borderColor: C.blue + '33', padding: 14, marginBottom: 12 },
  contextService: { color: C.blue, fontWeight: '700', fontSize: 15 },
  contextBudget: { color: C.textSub, fontSize: 13, marginTop: 4 },
  agentCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 16 },
  waitBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  waitTxt: { color: C.textSub, fontSize: 14 },
  bidCard: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  bidCardTop: { borderColor: C.blue + '55', backgroundColor: C.blueGlow },
  bestBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.amber + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.amber + '44', marginBottom: 12 },
  bestTxt: { color: C.amber, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bidHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  bidName: { color: C.text, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaTxt: { color: C.textMuted, fontSize: 12 },
  bidAmount: { color: C.text, fontWeight: '900', fontSize: 22 },
  expiryTxt: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  acceptBtn: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  acceptBtnPrimary: { backgroundColor: C.blue, borderColor: C.blue },
  acceptTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
