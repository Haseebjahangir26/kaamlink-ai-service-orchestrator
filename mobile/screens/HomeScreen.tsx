import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, Animated, Platform, UIManager } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { C, API_BASE, REASONINGS } from '../constants/kaamlink';
import { AgentStepRow, SectionHeader, PulsingDot } from '../components/KaamilinkUI';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ onNext }: { onNext: (data: any) => void }) {
  const [text, setText] = useState('AC bilkul thanda nahi kar raha, G-13 mein urgent chahiye');
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<any>(null);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, []);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true); setIntent(null); setStep(1);
    try {
      const r1 = await fetch(`${API_BASE}/api/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const intentData = await r1.json();
      if (intentData.service === 'invalid') { alert('Please describe a home service need.'); setStep(0); setLoading(false); return; }
      setIntent(intentData); setStep(2);
      const r2 = await fetch(`${API_BASE}/api/providers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(intentData) });
      const rawProviders = await r2.json();
      setStep(3); await new Promise(r => setTimeout(r, 700)); setStep(4);
      const providers = rawProviders.map((p: any, i: number) => ({ ...p, distance: (p.distance_km ?? (i + 1) * 0.9).toFixed(1) + 'km', eta: Math.round((p.distance_km ?? (i + 1) * 0.9) * 8 + 5) + ' mins', reasoning: REASONINGS[Math.min(i, REASONINGS.length - 1)] }));
      onNext({ intent: intentData, providers });
    } catch (e: any) { alert('Failed: ' + e.message); setStep(0); }
    setLoading(false);
  };

  const urgencyColor = intent?.urgency === 'high' ? C.red : intent?.urgency === 'medium' ? C.amber : C.green;
  const getStep = (n: number): 'done' | 'running' | 'waiting' => step > n ? 'done' : step === n ? 'running' : 'waiting';

  return (
    <SafeAreaView style={s.root}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.logoMark}><Text style={s.logoK}>K</Text></View>
            <View><Text style={s.brand}>Kaamlink</Text><Text style={s.brandSub}>AI Service Orchestrator</Text></View>
          </View>
          <View style={s.agentsBadge}><Text style={s.agentsText}>7 Agents Active</Text></View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.heading}>Apna masla batayein</Text>
          <Text style={s.subheading}>Roman Urdu, Urdu, or English — we understand all</Text>

          <View style={s.inputCard}>
            <TextInput style={s.input} value={text} onChangeText={setText} multiline placeholder="e.g. AC thanda nahi kar raha, G-13 mein urgent..." placeholderTextColor={C.textMuted} />
            <TouchableOpacity style={[s.sendBtn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          {intent && (
            <View style={s.chipCard}>
              <SectionHeader icon="git-network-outline" label="INTENT EXTRACTED" />
              <View style={s.chips}>
                <View style={[s.chip, { borderColor: C.blue + '44', backgroundColor: C.blueGlow }]}><Ionicons name="build" size={11} color={C.blue} /><Text style={[s.chipTxt, { color: C.blue }]}>{intent.service}</Text></View>
                <View style={[s.chip, { borderColor: C.purple + '44', backgroundColor: C.purple + '15' }]}><Ionicons name="location" size={11} color={C.purple} /><Text style={[s.chipTxt, { color: C.purple }]}>{intent.location}</Text></View>
                <View style={[s.chip, { borderColor: urgencyColor + '44', backgroundColor: urgencyColor + '15' }]}><Ionicons name="flash" size={11} color={urgencyColor} /><Text style={[s.chipTxt, { color: urgencyColor }]}>{intent.urgency}</Text></View>
                <View style={[s.chip, { borderColor: C.green + '44', backgroundColor: C.greenGlow }]}><Ionicons name="hardware-chip" size={11} color={C.green} /><Text style={[s.chipTxt, { color: C.green }]}>{intent.complexity || 'intermediate'}</Text></View>
                <View style={s.chip}><Ionicons name="time" size={11} color={C.textSub} /><Text style={s.chipTxt}>{intent.preferred_time}</Text></View>
                <View style={s.chip}><Text style={[s.chipTxt, { color: C.textSub }]}>{Math.round(intent.confidence * 100)}% confidence</Text></View>
              </View>
            </View>
          )}

          <View style={s.traceCard}>
            <SectionHeader icon="server-outline" label="AGENT TRACE" />
            <AgentStepRow title="[1] INTENT AGENT" desc={intent ? `${intent.service} · ${intent.location} · ${intent.urgency} urgency` : 'Awaiting input...'} status={getStep(1)} />
            <AgentStepRow title="[2] DISCOVERY AGENT" desc={step > 2 ? `Matched providers for ${intent?.service}` : step === 2 ? `Scanning providers near ${intent?.location}...` : 'Pending'} status={getStep(2)} />
            <AgentStepRow title="[3] RANKING AGENT" desc={step > 3 ? 'Ranked by proximity · rating · reliability' : 'Pending discovery'} status={getStep(3)} />
            <AgentStepRow title="[4] BOOKING AGENT" desc="Ready to confirm your selection" status={step >= 4 ? 'done' : 'waiting'} />
          </View>
        </ScrollView>

        <View style={s.tabs}>
          {[['grid', 'HOME', true], ['compass-outline', 'SERVICES', false], ['chatbubble-outline', 'REQUESTS', false], ['person-outline', 'ACCOUNT', false]].map(([icon, label, active]) => (
            <View key={label as string} style={s.tab}>
              <Ionicons name={icon as any} size={20} color={active ? C.blue : C.textMuted} />
              <Text style={[s.tabLabel, active && { color: C.blue }]}>{label as string}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.blue + '22', borderWidth: 1, borderColor: C.blue + '44', alignItems: 'center', justifyContent: 'center' },
  logoK: { color: C.blue, fontWeight: '900', fontSize: 20 },
  brand: { color: C.text, fontWeight: '800', fontSize: 18 },
  brandSub: { color: C.textMuted, fontSize: 11 },
  agentsBadge: { backgroundColor: C.green + '15', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.green + '33' },
  agentsText: { color: C.green, fontSize: 11, fontWeight: '700' },
  heading: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textMuted, marginBottom: 18 },
  inputCard: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, paddingBottom: 50, marginBottom: 14 },
  input: { color: C.text, fontSize: 16, minHeight: 80, textAlignVertical: 'top', lineHeight: 24 },
  sendBtn: { position: 'absolute', right: 12, bottom: 12, width: 42, height: 42, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  chipCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
  chipTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  traceCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, marginTop: 4, letterSpacing: 0.5 },
});
