import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, Easing
} from 'react-native';

const API = 'http://127.0.0.1:8000';
const COLORS = {
  bg: '#0A0A14', card: '#12121F', border: '#1E1E35',
  blue: '#4F8EF7', purple: '#A855F7', green: '#22C55E',
  amber: '#F59E0B', red: '#EF4444', text: '#E2E8F0',
  muted: '#6B7280', white: '#FFFFFF',
};

// ─── Reusable Components ──────────────────────────────────────────────────────

function AgentTrace({ logs }) {
  return (
    <View style={s.traceBox}>
      <Text style={s.traceTitle}>🤖 Agent Trace</Text>
      {logs.slice(0, 6).map((l, i) => (
        <View key={i} style={s.traceRow}>
          <Text style={s.traceDot}>▸</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.traceAgent}>{l.agent_name}</Text>
            <Text style={s.traceMsg}>{l.decision}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PulsingDot({ color }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.dot, { backgroundColor: color, opacity: anim }]} />;
}

// ─── Screen 0: Home ──────────────────────────────────────────────────────────

function HomeScreen({ onNext }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const r = await fetch(`${API}/api/logs`);
      const d = await r.json();
      setLogs(d);
    } catch (_) {}
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const intentRes = await fetch(`${API}/api/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const intent = await intentRes.json();
      if (intent.service === 'invalid') {
        alert('Invalid request. Please describe a home service need.');
        setLoading(false); return;
      }
      const provRes = await fetch(`${API}/api/providers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      const providers = await provRes.json();
      await fetchLogs();
      onNext({ intent, providers });
    } catch (e) {
      alert('Could not connect to backend. Is the server running?');
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.logo}>⚡ Kaamlink</Text>
        <Text style={s.logoSub}>AI Service Orchestrator</Text>
        <View style={s.badge}><Text style={s.badgeText}>Phase 2 • 7 Agents</Text></View>
      </View>
      <View style={s.card}>
        <Text style={s.label}>Apna masla batayein</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. AC thanda nahi kar raha, G-13 mein"
          placeholderTextColor={COLORS.muted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>🔍 Find Provider</Text>}
        </TouchableOpacity>
      </View>
      {logs.length > 0 && <AgentTrace logs={logs} />}
    </ScrollView>
  );
}

// ─── Screen 1: Pricing ───────────────────────────────────────────────────────

function PricingScreen({ data, onNext, onBack }) {
  const { intent, providers } = data;
  const [pricing, setPricing] = useState(null);
  const [budget, setBudget] = useState('');
  const [prob, setProb] = useState(null);
  const [loading, setLoading] = useState(true);
  const probAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetch(`${API}/api/pricing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: intent.service, urgency: intent.urgency,
        location: intent.location, complexity: 'intermediate',
      }),
    }).then(r => r.json()).then(d => { setPricing(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const onBudgetChange = (val) => {
    setBudget(val);
    if (pricing && val) {
      const p = Math.min(95, Math.round((parseInt(val) / pricing.suggested_offer) * 100));
      setProb(isNaN(p) ? null : p);
      Animated.timing(probAnim, { toValue: (isNaN(p) ? 0 : p) / 100, duration: 400, useNativeDriver: false }).start();
    } else { setProb(null); probAnim.setValue(0); }
  };

  const probColor = prob >= 75 ? COLORS.green : prob >= 50 ? COLORS.amber : COLORS.red;
  const barWidth = probAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (loading) return (
    <View style={[s.screen, s.center]}>
      <ActivityIndicator size="large" color={COLORS.blue} />
      <Text style={[s.muted, { marginTop: 12 }]}>Pricing Agent calculating...</Text>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.screenTitle}>✨ Fair Price Estimate</Text>
      </View>
      <View style={s.card}>
        <Text style={s.serviceTag}>{intent.service} • {intent.urgency} urgency</Text>
        {pricing && <>
          <View style={s.priceBox}>
            <Text style={s.priceLabel}>Market Range</Text>
            <Text style={s.priceRange}>PKR {pricing.market_min.toLocaleString()} – {pricing.market_max.toLocaleString()}</Text>
          </View>
          <View style={s.suggestedBox}>
            <Text style={s.aiLabel}>🤖 AI Suggested</Text>
            <Text style={s.suggestedPrice}>PKR {pricing.suggested_offer.toLocaleString()}</Text>
          </View>
          <View style={s.factors}>
            {pricing.factors.map((f, i) => <View key={i} style={s.chip}><Text style={s.chipText}>{f}</Text></View>)}
          </View>
          <Text style={s.label}>Custom Budget (PKR)</Text>
          <TextInput
            style={s.input} keyboardType="numeric"
            placeholder={`${pricing.suggested_offer}`} placeholderTextColor={COLORS.muted}
            value={budget} onChangeText={onBudgetChange}
          />
          {prob !== null && (
            <View style={{ marginBottom: 16 }}>
              <View style={s.probBar}>
                <Animated.View style={[s.probFill, { width: barWidth, backgroundColor: probColor }]} />
              </View>
              <Text style={[s.probText, { color: probColor }]}>{prob}% acceptance probability</Text>
            </View>
          )}
          <Text style={s.muted}>{pricing.recommendation}</Text>
        </>}
      </View>
      <TouchableOpacity style={s.btn} onPress={() => onNext({ intent, providers, pricing, userBudget: budget ? parseInt(budget) : pricing?.suggested_offer })}>
        <Text style={s.btnText}>Accept PKR {budget || pricing?.suggested_offer} →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnOutline} onPress={() => onNext({ intent, providers, pricing, userBudget: null })}>
        <Text style={s.btnOutlineText}>Skip Pricing →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Screen 2: Live Bids ─────────────────────────────────────────────────────

function BidsScreen({ data, onNext, onBack }) {
  const { intent, providers, pricing, userBudget } = data;
  const [bids, setBids] = useState([]);
  const [shown, setShown] = useState(0);
  const [secs, setSecs] = useState(120);
  const [loading, setLoading] = useState(true);
  const slideAnims = useRef([0, 1, 2].map(() => new Animated.Value(80))).current;

  useEffect(() => {
    fetch(`${API}/api/bids`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers, urgency: intent.urgency, user_budget: userBudget }),
    }).then(r => r.json()).then(d => { setBids(d.bids || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (bids.length === 0) return;
    [0, 1, 2].forEach(i => {
      setTimeout(() => {
        setShown(i + 1);
        Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true }).start();
      }, 1500 * (i + 1));
    });
  }, [bids]);

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <View style={s.timerRow}>
          <PulsingDot color={COLORS.green} />
          <Text style={s.screenTitle}> Live Bids</Text>
          <Text style={s.timer}> {mm}:{ss}</Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.serviceTag}>{intent.service} • {intent.location}</Text>
        <Text style={s.muted}>Budget: PKR {userBudget?.toLocaleString() || 'open'}</Text>
      </View>
      {loading && <ActivityIndicator color={COLORS.blue} style={{ marginTop: 20 }} />}
      {bids.length === 0 && !loading && (
        <View style={s.center}><Text style={s.muted}>Waiting for bids...</Text></View>
      )}
      {bids.slice(0, shown).map((bid, i) => (
        <Animated.View key={bid.id} style={[s.bidCard, { transform: [{ translateY: slideAnims[i] }] }]}>
          <View style={s.bidTop}>
            <View style={s.avatar}><Text style={s.avatarText}>{bid.provider_name?.[0]}</Text></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.providerName}>{bid.provider_name}</Text>
              <Text style={s.muted}>⏱ {bid.eta_mins} min away</Text>
            </View>
            <View>
              <Text style={s.bidAmount}>PKR {bid.amount?.toLocaleString()}</Text>
              {i === 0 && <View style={s.bestBadge}><Text style={s.bestText}>Best Value</Text></View>}
            </View>
          </View>
          <TouchableOpacity style={[s.btn, { marginTop: 10 }]} onPress={() => onNext({ ...data, selectedBid: bid })}>
            <Text style={s.btnText}>Accept Bid →</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

// ─── Screen 3: Booking Confirmed ─────────────────────────────────────────────

function ConfirmedScreen({ data, onNext, onRestart }) {
  const { intent, selectedBid, pricing } = data;
  const [bookingId, setBookingId] = useState(null);
  const [timelineStep, setTimelineStep] = useState(0);

  const timeline = [
    { label: 'Booking Confirmed', msg: 'Aapki booking confirm ho gayi', color: COLORS.green },
    { label: 'Provider En Route', msg: 'Provider raaston par hai', color: COLORS.blue },
    { label: 'Provider Arrived', msg: 'Provider pahunch gaya', color: COLORS.blue },
    { label: 'Service Completed', msg: 'Kaam mukammal ho gaya', color: COLORS.purple },
    { label: 'Rate Your Experience', msg: 'Apna feedback dein ⭐', color: COLORS.amber },
  ];

  useEffect(() => {
    fetch(`${API}/api/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: selectedBid.provider_id, user_id: 'demo_user', service: intent.service, amount: selectedBid.amount }),
    }).then(r => r.json()).then(d => setBookingId(d.booking_id)).catch(() => setBookingId('demo-' + Date.now()));
  }, []);

  useEffect(() => {
    if (timelineStep >= timeline.length) return;
    const t = setTimeout(() => setTimelineStep(s => s + 1), 2000);
    return () => clearTimeout(t);
  }, [timelineStep]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.successHeader}>
        <Text style={s.successIcon}>✅</Text>
        <Text style={s.successTitle}>Booking Confirmed!</Text>
        <Text style={s.muted}>#{bookingId?.slice(0, 8) || '...'}</Text>
      </View>
      <View style={s.card}>
        <View style={s.bidTop}>
          <View style={s.avatar}><Text style={s.avatarText}>{selectedBid.provider_name?.[0]}</Text></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.providerName}>{selectedBid.provider_name}</Text>
            <Text style={s.muted}>⏱ {selectedBid.eta_mins} min ETA</Text>
          </View>
          <Text style={s.bidAmount}>PKR {selectedBid.amount?.toLocaleString()}</Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.label}>Service Timeline</Text>
        {timeline.map((item, i) => (
          <View key={i} style={s.timelineRow}>
            <View style={[s.timelineDot, { backgroundColor: i < timelineStep ? item.color : COLORS.border }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.timelineLabel, i < timelineStep && { color: item.color }]}>{item.label}</Text>
              {i < timelineStep && <Text style={s.muted}>{item.msg}</Text>}
            </View>
            {i < timelineStep && <Text style={{ color: item.color }}>✓</Text>}
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.btn, { backgroundColor: COLORS.amber }]} onPress={() => onNext({ ...data, bookingId })}>
        <Text style={s.btnText}>🔴 Simulate Cancellation</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnOutline} onPress={onRestart}>
        <Text style={s.btnOutlineText}>New Request</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Screen 4: Recovery ──────────────────────────────────────────────────────

function RecoveryScreen({ data, onRestart }) {
  const { bookingId, selectedBid } = data;
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/recover`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId || 'demo-booking' }),
    }).then(r => r.json()).then(d => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < d.steps.length) { setSteps(prev => [...prev, d.steps[i]]); i++; }
        else { clearInterval(interval); setResult(d); setLoading(false); }
      }, 1200);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[s.recoveryBanner]}>
        <Text style={s.recoveryIcon}>⚠️</Text>
        <Text style={s.recoveryTitle}>Provider Cancelled</Text>
        <Text style={s.muted}>{selectedBid?.provider_name} cancelled unexpectedly.</Text>
        <Text style={s.muted}>Recovery Agent is finding a replacement...</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>🔄 Recovery Agent Trace</Text>
        {steps.map((step, i) => (
          <View key={i} style={s.recoveryStep}>
            <Text style={[s.traceDot, { color: COLORS.blue }]}>▸</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.traceMsg}>{step.message}</Text>
              {step.detail ? <Text style={s.muted}>{step.detail}</Text> : null}
            </View>
          </View>
        ))}
        {loading && <ActivityIndicator color={COLORS.blue} style={{ marginTop: 10 }} />}
      </View>
      {result?.success && result.replacement_provider && (
        <View style={[s.card, { borderColor: COLORS.green, borderWidth: 1 }]}>
          <Text style={[s.label, { color: COLORS.green }]}>✅ Replacement Confirmed!</Text>
          <View style={s.bidTop}>
            <View style={[s.avatar, { backgroundColor: COLORS.green }]}>
              <Text style={s.avatarText}>{result.replacement_provider.name?.[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.providerName}>{result.replacement_provider.name}</Text>
              <Text style={s.muted}>⏱ {result.replacement_provider.eta_mins} min ETA</Text>
            </View>
            <Text style={s.bidAmount}>PKR {result.replacement_provider.base_price?.toLocaleString()}</Text>
          </View>
          <Text style={[s.muted, { marginTop: 8 }]}>{result.message}</Text>
        </View>
      )}
      {!loading && (
        <TouchableOpacity style={s.btn} onPress={onRestart}>
          <Text style={s.btnText}>Start New Request</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState(0);
  const [flowData, setFlowData] = useState({});

  const restart = () => { setScreen(0); setFlowData({}); };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {screen === 0 && <HomeScreen onNext={d => { setFlowData(d); setScreen(1); }} />}
      {screen === 1 && <PricingScreen data={flowData} onNext={d => { setFlowData(d); setScreen(2); }} onBack={() => setScreen(0)} />}
      {screen === 2 && <BidsScreen data={flowData} onNext={d => { setFlowData(d); setScreen(3); }} onBack={() => setScreen(1)} />}
      {screen === 3 && <ConfirmedScreen data={flowData} onNext={d => { setFlowData(d); setScreen(4); }} onRestart={restart} />}
      {screen === 4 && <RecoveryScreen data={flowData} onRestart={restart} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16, paddingTop: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 36, fontWeight: '900', color: COLORS.blue, letterSpacing: 1 },
  logoSub: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  badge: { backgroundColor: COLORS.purple + '33', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  badgeText: { color: COLORS.purple, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  label: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#1A1A2E', color: COLORS.text, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  btn: { backgroundColor: COLORS.blue, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: COLORS.blue, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  btnOutlineText: { color: COLORS.blue, fontWeight: '700', fontSize: 16 },
  muted: { color: COLORS.muted, fontSize: 13 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: COLORS.blue, fontSize: 15, marginRight: 12 },
  screenTitle: { color: COLORS.text, fontWeight: '700', fontSize: 18 },
  serviceTag: { color: COLORS.purple, fontWeight: '600', marginBottom: 6 },
  priceBox: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, marginBottom: 12 },
  priceLabel: { color: COLORS.muted, fontSize: 12 },
  priceRange: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  suggestedBox: { backgroundColor: COLORS.blue + '22', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.blue + '44' },
  aiLabel: { color: COLORS.blue, fontSize: 12, fontWeight: '600' },
  suggestedPrice: { color: COLORS.blue, fontSize: 26, fontWeight: '900', marginTop: 4 },
  factors: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: { backgroundColor: COLORS.purple + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  chipText: { color: COLORS.purple, fontSize: 12 },
  probBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  probFill: { height: 8, borderRadius: 4 },
  probText: { fontSize: 13, fontWeight: '600' },
  timerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timer: { color: COLORS.green, fontWeight: '700', fontSize: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bidCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  bidTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  providerName: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  bidAmount: { color: COLORS.blue, fontWeight: '900', fontSize: 18 },
  bestBadge: { backgroundColor: COLORS.green + '33', borderRadius: 8, padding: 3, marginTop: 3, alignItems: 'center' },
  bestText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  successHeader: { alignItems: 'center', paddingVertical: 24 },
  successIcon: { fontSize: 48, marginBottom: 8 },
  successTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  timelineLabel: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
  recoveryBanner: { backgroundColor: COLORS.amber + '22', borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.amber + '55' },
  recoveryIcon: { fontSize: 36, marginBottom: 8 },
  recoveryTitle: { color: COLORS.amber, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  recoveryStep: { flexDirection: 'row', marginBottom: 10 },
  traceBox: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  traceTitle: { color: COLORS.purple, fontWeight: '700', marginBottom: 10, fontSize: 14 },
  traceRow: { flexDirection: 'row', marginBottom: 8 },
  traceDot: { color: COLORS.purple, marginRight: 6, marginTop: 1 },
  traceAgent: { color: COLORS.blue, fontSize: 12, fontWeight: '600' },
  traceMsg: { color: COLORS.text, fontSize: 13 },
});
