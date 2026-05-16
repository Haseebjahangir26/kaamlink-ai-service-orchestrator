import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, LayoutAnimation, UIManager, Platform, Animated
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#07080F',   // near-black canvas
  surface:    '#0F1117',   // card base
  surfaceAlt: '#141720',   // slightly lighter panel
  border:     '#1E2130',   // subtle border
  borderGlow: '#4facfe40', // neon border hint
  neon1:      '#00f2fe',   // cyan
  neon2:      '#4facfe',   // blue
  accent:     '#635BFF',   // indigo / blurple
  accentDim:  '#635BFF22',
  amber:      '#F59E0B',
  emerald:    '#10B981',
  text:       '#F1F5F9',
  textSub:    '#64748B',
  textMuted:  '#334155',
};

function PulsingDot({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.6, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1,   duration: 0,   useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1,   duration: 0,   useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [active]);

  return (
    <View style={{ width: 12, height: 12, marginRight: 8 }}>
      <Animated.View style={[
        styles.dotBase,
        active ? { backgroundColor: C.neon1 } : { backgroundColor: C.textMuted },
        active && { transform: [{ scale }], opacity },
      ]} />
    </View>
  );
}

function PulsingEmoji() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);
  return <Animated.Text style={{ fontSize: 11, opacity }}>🔵</Animated.Text>;
}

export default function HomeScreen() {
  const [requestText, setRequestText]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [intentData, setIntentData]       = useState<any>(null);
  const [providers, setProviders]         = useState<any[]>([]);
  const [bookedProvider, setBookedProvider] = useState<any>(null);
  const [bookingId, setBookingId]         = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [logs, setLogs]                   = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // ── Log polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/logs');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && JSON.stringify(data) !== JSON.stringify(logs)) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLogs(data);
          }
        }
      } catch (_) {}
    };
    fetchLogs();
    const id = setInterval(fetchLogs, 1500);
    return () => clearInterval(id);
  }, [logs]);

  // ── Send request ─────────────────────────────────────────────────────────────
  const sendRequest = async () => {
    if (!requestText.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true); setIntentData(null); setProviders([]); setBookingId(null); setIsDiscovering(true);

    try {
      const intentRes = await fetch('http://127.0.0.1:8000/api/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requestText }),
      });
      if (!intentRes.ok) throw new Error(await intentRes.text());
      const intent = await intentRes.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIntentData(intent);

      const providersRes = await fetch('http://127.0.0.1:8000/api/providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (!providersRes.ok) throw new Error(await providersRes.text());
      const providersList = await providersRes.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProviders(providersList || []);
    } catch (error: any) {
      alert('Request Failed: ' + error.message);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false); setIsDiscovering(false);
    }
  };

  // ── Book provider ────────────────────────────────────────────────────────────
  const bookProvider = async (providerId: string) => {
    setBookingLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, user_id: 'user-123', service: intentData.service }),
      });
      const data = await res.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setBookingId(data.booking_id);
      setBookedProvider(providers.find(p => p.id === providerId));
    } catch (err) {
      alert('Failed to book provider.');
    } finally {
      setBookingLoading(false);
    }
  };

  const isActive = loading || isDiscovering;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.appWrapper}>

        {/* ── Header ── */}
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>K</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Kaamlink</Text>
            <Text style={styles.brandSubtitle}>AI SERVICE ORCHESTRATOR</Text>
          </View>
          <View style={styles.headerLiveChip}>
            <View style={[styles.dotBase, { backgroundColor: C.emerald, width: 6, height: 6, borderRadius: 3, marginRight: 5 }]} />
            <Text style={styles.headerLiveText}>LIVE</Text>
          </View>
        </View>

        {/* ── Input card ── */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionHeading}>What do you need help with?</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. AC thanda nahi kar raha, G-13"
            placeholderTextColor={C.textMuted}
            value={requestText}
            onChangeText={setRequestText}
            multiline
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!requestText.trim() || loading) && styles.primaryBtnDisabled]}
            onPress={sendRequest}
            disabled={loading || !requestText.trim()}
          >
            {loading
              ? <ActivityIndicator color={C.bg} size="small" />
              : <Text style={styles.primaryBtnText}>⚡  Analyze &amp; Find Provider</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── System Diagnostics / Agent Trace ── */}
        <View style={[styles.glassCard, styles.diagnosticCard]}>
          <View style={styles.diagnosticHeader}>
            <Text style={styles.diagnosticTitle}>AGENT TRACE</Text>
            <View style={styles.statusChip}>
              <PulsingDot active={isActive} />
              <Text style={[styles.statusText, isActive && { color: C.neon1 }]}>
                {isActive ? 'Processing' : 'Idle'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <ScrollView style={styles.logContainer} nestedScrollEnabled>
            {logs.length === 0 && <Text style={styles.logEmptyText}>No active operations.</Text>}
            {logs.map((log, idx) => {
              const isLatestActive = idx === 0 && isActive;
              return (
              <View key={log.id || idx} style={styles.logEntry}>
                <View style={[styles.logTimelineTrack, { width: 20, marginRight: 8, paddingTop: 1 }]}>
                  {isLatestActive ? <PulsingEmoji /> : <Text style={{ fontSize: 11 }}>✅</Text>}
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logAgentName}>{log.agent_name}</Text>
                  <Text style={[styles.logActionText, isLatestActive && { color: C.neon2 }]}>{log.decision}</Text>
                  {!!log.reasoning && <Text style={styles.logMetaText}>{log.reasoning}</Text>}
                </View>
              </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Results ── */}
        {intentData && !bookingId && (
          <View>
            <View style={styles.intentBadge}>
              <Text style={styles.intentBadgeLabel}>Detected Intent</Text>
              <Text style={styles.intentBadgeValue}>{intentData.service} · {intentData.location}</Text>
            </View>

            <Text style={styles.sectionHeading}>Matched Providers</Text>

            {providers.length === 0 && !isDiscovering ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateText}>No providers match this request.</Text>
              </View>
            ) : (
              providers.map((p) => {
                const isPremium = p.rating >= 4.8;
                return (
                  <View key={p.id} style={[styles.glassCard, styles.providerCard, isPremium && styles.providerCardPremium]}>
                    <View style={styles.providerTop}>
                      {/* Avatar */}
                      <View style={[styles.avatar, isPremium && styles.avatarPremium]}>
                        <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
                      </View>
                      {/* Meta */}
                      <View style={styles.providerMeta}>
                        <View style={styles.providerNameRow}>
                          <Text style={styles.providerTitle}>{p.name}</Text>
                          {isPremium && (
                            <View style={styles.premiumBadge}>
                              <Text style={styles.premiumBadgeText}>★ PREMIUM</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.providerStats}>
                          <View style={styles.ratingPill}>
                            <Text style={styles.ratingText}>★ {p.rating.toFixed(1)}</Text>
                          </View>
                          <Text style={styles.locationText}>📍 {p.location}</Text>
                        </View>
                      </View>
                      {/* Price */}
                      <View style={styles.priceBlock}>
                        <Text style={styles.priceLabel}>Base Rate</Text>
                        <Text style={styles.priceValue}>Rs.{p.base_price}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.bookBtn, isPremium && styles.bookBtnPremium]}
                      onPress={() => bookProvider(p.id)}
                      disabled={bookingLoading}
                    >
                      <Text style={[styles.bookBtnText, isPremium && { color: C.bg }]}>Book Appointment</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Booking Success ── */}
        {bookingId && bookedProvider && (
          <View style={[styles.glassCard, styles.successCard]}>
            <View style={styles.successIconBox}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Booking Confirmed</Text>
            <Text style={styles.successDesc}>Your service request has been processed successfully.</Text>
            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference ID</Text>
                <Text style={styles.receiptValue}>{bookingId.split('-')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Provider</Text>
                <Text style={styles.receiptValue}>{bookedProvider.name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Service</Text>
                <Text style={styles.receiptValue}>{intentData.service}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Est. Price</Text>
                <Text style={styles.receiptValue}>Rs.{bookedProvider.base_price}</Text>
              </View>
              <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.receiptLabel}>Status</Text>
                <Text style={[styles.receiptValue, { color: C.emerald }]}>● Provider Confirmed — arriving in 18 min</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setBookingId(null); setBookedProvider(null); setIntentData(null); setProviders([]); setRequestText('');
            }}>
              <Text style={styles.secondaryBtnText}>Create New Request</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  appWrapper:   { maxWidth: 600, width: '100%', alignSelf: 'center', padding: 20, paddingTop: 60 },

  // Glass card
  glassCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.neon2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },

  // Header
  headerArea:     { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  logoBadgeText:  { color: '#fff', fontSize: 22, fontWeight: '800' },
  brandTitle:     { fontSize: 20, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  brandSubtitle:  { fontSize: 10, color: C.textSub, fontWeight: '600', letterSpacing: 1.5 },
  headerLiveChip: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10B98122', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#10B98144',
  },
  headerLiveText: { fontSize: 10, fontWeight: '700', color: C.emerald, letterSpacing: 1 },

  // Input
  sectionHeading: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 14 },
  inputField: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, minHeight: 110,
    fontSize: 15, color: C.text, textAlignVertical: 'top', marginBottom: 16, lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: C.neon1, paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: C.neon1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  primaryBtnDisabled: { backgroundColor: C.textMuted, shadowOpacity: 0 },
  primaryBtnText: { color: C.bg, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },

  // Diagnostics
  diagnosticCard: { minHeight: 250, maxHeight: 400 },
  diagnosticHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diagnosticTitle: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 1.5 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  dotBase:    { width: 8, height: 8, borderRadius: 4, position: 'absolute' },
  statusText: { fontSize: 11, fontWeight: '600', color: C.textSub },
  divider:    { height: 1, backgroundColor: C.border, marginVertical: 14 },
  logContainer: { flex: 1 },
  logEmptyText: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  logEntry:   { flexDirection: 'row', marginBottom: 14 },
  logTimelineTrack: { width: 14, alignItems: 'center', marginRight: 12, paddingTop: 4 },
  logTimelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.neon1, shadowColor: C.neon1, shadowOpacity: 0.8, shadowRadius: 4 },
  logContent: { flex: 1 },
  logAgentName: { fontSize: 10, fontWeight: '700', color: C.neon2, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  logActionText: { fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 19 },
  logMetaText:   { fontSize: 12, color: C.textSub, marginTop: 3, lineHeight: 17 },

  // Intent badge
  intentBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.accentDim, padding: 12, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: C.accent + '55',
  },
  intentBadgeLabel: { fontSize: 12, fontWeight: '600', color: C.neon2, marginRight: 8 },
  intentBadgeValue: { fontSize: 14, fontWeight: '700', color: C.text },

  // Empty
  emptyStateBox: {
    backgroundColor: C.surface, padding: 32, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
  },
  emptyStateText: { fontSize: 14, color: C.textSub },

  // Provider cards
  providerCard:        { marginBottom: 14 },
  providerCardPremium: { borderColor: C.neon2 + '55', shadowColor: C.neon1, shadowOpacity: 0.15 },
  providerTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent + '33', justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: C.accent + '55',
  },
  avatarPremium: { backgroundColor: C.neon1 + '22', borderColor: C.neon1 + '88' },
  avatarText:    { fontSize: 18, fontWeight: '700', color: C.neon2 },
  providerMeta:  { flex: 1 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  providerTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginRight: 8 },
  premiumBadge: {
    backgroundColor: C.neon1 + '22', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: C.neon1 + '66',
  },
  premiumBadgeText: { fontSize: 9, fontWeight: '800', color: C.neon1, letterSpacing: 0.8 },
  providerStats: { flexDirection: 'row', alignItems: 'center' },
  ratingPill: {
    backgroundColor: '#F59E0B22', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginRight: 10, borderWidth: 1, borderColor: '#F59E0B44',
  },
  ratingText:    { fontSize: 12, fontWeight: '700', color: C.amber },
  locationText:  { fontSize: 12, color: C.textSub, fontWeight: '500' },
  priceBlock:    { alignItems: 'flex-end' },
  priceLabel:    { fontSize: 10, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
  priceValue:    { fontSize: 16, fontWeight: '700', color: C.text },
  bookBtn: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  bookBtnPremium: { backgroundColor: C.neon1, borderColor: C.neon1, shadowColor: C.neon1, shadowOpacity: 0.4, shadowRadius: 8 },
  bookBtnText:   { fontSize: 13, fontWeight: '600', color: C.text },

  // Success
  successCard:   { alignItems: 'center', marginTop: 8 },
  successIconBox: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.emerald + '22',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: C.emerald + '55',
  },
  successIcon:  { fontSize: 32, color: C.emerald },
  successTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 6 },
  successDesc:  { fontSize: 13, color: C.textSub, textAlign: 'center', marginBottom: 24 },
  receiptBox: {
    width: '100%', backgroundColor: C.surfaceAlt,
    borderRadius: 12, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: C.border,
  },
  receiptRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  receiptLabel: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  receiptValue: { fontSize: 13, fontWeight: '600', color: C.text },
  secondaryBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.textSub },
});
