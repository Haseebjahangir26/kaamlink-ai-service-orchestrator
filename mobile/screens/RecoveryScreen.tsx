import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, API_BASE } from '../constants/kaamlink';
import { Avatar } from '../components/KaamilinkUI';

export default function RecoveryScreen({ data, onRestart }: { data: any; onRestart: () => void }) {
  const { selectedBid, bookingId } = data;
  const [steps, setSteps] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/recover`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId || 'demo-booking' }) })
      .then(r => r.json()).then(d => {
        let i = 0;
        const tick = setInterval(() => {
          if (i < d.steps.length) { setSteps(prev => [...prev, d.steps[i]]); i++; }
          else { clearInterval(tick); setResult(d); setLoading(false); }
        }, 1400);
      }).catch(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View style={s.warningBanner}>
          <Ionicons name="warning" size={32} color={C.amber} style={{ marginBottom: 8 }} />
          <Text style={s.warnTitle}>Provider Cancelled</Text>
          <Text style={s.warnSub}>{selectedBid?.provider_name} cancelled unexpectedly.</Text>
          <Text style={s.warnSub}>Recovery Agent is finding a replacement...</Text>
        </View>

        <View style={s.traceCard}>
          <View style={s.traceHeader}>
            <Ionicons name="refresh-circle" size={18} color={C.blue} />
            <Text style={s.traceTitle}> [7] RECOVERY AGENT — Live Trace</Text>
          </View>
          {steps.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepDot}><Ionicons name="checkmark" size={10} color={C.blue} /></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.stepMsg}>{step.message}</Text>
                {step.detail ? <Text style={s.stepDetail}>{step.detail}</Text> : null}
              </View>
            </View>
          ))}
          {loading && <View style={s.loadingRow}><ActivityIndicator size="small" color={C.blue} /><Text style={s.loadingTxt}> Agent working...</Text></View>}
        </View>

        {result?.success && result.replacement_provider && (
          <View style={s.successCard}>
            <View style={s.successHeader}>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
              <Text style={s.successTitle}> Replacement Confirmed!</Text>
            </View>
            <View style={s.provRow}>
              <Avatar name={result.replacement_provider.name} color={C.green} size={52} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.provName}>{result.replacement_provider.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="time-outline" size={13} color={C.green} />
                  <Text style={s.provEta}> {result.replacement_provider.eta_mins} min ETA</Text>
                </View>
                <Text style={s.provPrice}>PKR {result.replacement_provider.base_price?.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={s.successMsg}>{result.message}</Text>
          </View>
        )}

        {!loading && (
          <TouchableOpacity style={s.restartBtn} onPress={onRestart}>
            <Text style={s.restartTxt}>Start New Request →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  warningBanner: { backgroundColor: C.amber + '15', borderRadius: 20, padding: 24, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: C.amber + '44' },
  warnTitle: { fontSize: 22, fontWeight: '900', color: C.amber, marginBottom: 6 },
  warnSub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  traceCard: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.blue + '44', padding: 16, marginBottom: 14 },
  traceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  traceTitle: { color: C.blue, fontWeight: '700', fontSize: 13 },
  stepRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.blueGlow, borderWidth: 1, borderColor: C.blue + '55', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepMsg: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  stepDetail: { color: C.textMuted, fontSize: 12, lineHeight: 17 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  loadingTxt: { color: C.textSub, fontSize: 13 },
  successCard: { backgroundColor: C.green + '10', borderRadius: 18, borderWidth: 1, borderColor: C.green + '44', padding: 18, marginBottom: 14 },
  successHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  successTitle: { color: C.green, fontWeight: '800', fontSize: 16 },
  provRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  provName: { color: C.text, fontWeight: '800', fontSize: 16 },
  provEta: { color: C.green, fontSize: 13, fontWeight: '600' },
  provPrice: { color: C.textSub, fontSize: 13, marginTop: 4 },
  successMsg: { color: C.textSub, fontSize: 13, lineHeight: 20 },
  restartBtn: { backgroundColor: C.blue, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 },
  restartTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
