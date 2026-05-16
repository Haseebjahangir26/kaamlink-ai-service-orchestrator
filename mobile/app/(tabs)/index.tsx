import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, LayoutAnimation, UIManager, Platform, Animated,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#0B0E14',
  surface:    '#12151E',
  surfaceAlt: '#1A1D27',
  border:     '#1C1F2E',
  blue:       '#3B82F6',
  blueDim:    '#3B82F622',
  green:      '#10B981',
  greenDim:   '#10B98122',
  red:        '#EF4444',
  redDim:     '#EF444422',
  text:       '#F8FAFC',
  textSub:    '#94A3B8',
  textMuted:  '#475569',
};

const mockReasonings = [
  "Highest rated for cooling issues and closest to your location.",
  "Reliable history with zero cancellations in this area.",
  "Budget-friendly option with certified technicians.",
  "Available immediately with great customer reviews."
];
const mockETAs = ["25 mins", "45 mins", "1 hour", "1.5 hours", "2 hours"];

function PulsingDot() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity, width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue, marginRight: 8, marginTop: 4 }} />
  );
}

export default function HomeScreen() {
  const [currentView, setCurrentView] = useState<'home' | 'providers' | 'success'>('home');
  const [requestText, setRequestText] = useState('AC bilkul thanda nahi kar raha, kal subah G-13 mein technician chahiye');
  const [loading, setLoading] = useState(false);
  const [intentData, setIntentData] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [bookedProvider, setBookedProvider] = useState<any>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [agentStep, setAgentStep] = useState(0); // 0=idle, 1=intent, 2=discovery, 3=ranking, 4=done

  // ── Send request ─────────────────────────────────────────────────────────────
  const sendRequest = async () => {
    if (!requestText.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true); setIntentData(null); setProviders([]); setAgentStep(1);

    try {
      const intentRes = await fetch('http://192.168.18.143:8000/api/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requestText }),
      });
      if (!intentRes.ok) throw new Error('Intent extraction failed');
      const intent = await intentRes.json();
      setIntentData(intent);
      setAgentStep(2);

      const providersRes = await fetch('http://192.168.18.143:8000/api/providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (!providersRes.ok) throw new Error('Provider discovery failed');
      const providersList = await providersRes.json();
      
      // Inject mock frontend data for UI
      const enrichedProviders = providersList.map((p: any, idx: number) => ({
        ...p,
        distance: (Math.random() * 4 + 1).toFixed(1) + 'km',
        eta: mockETAs[Math.min(idx, mockETAs.length - 1)],
        reasoning: mockReasonings[Math.min(idx, mockReasonings.length - 1)],
      }));
      
      setProviders(enrichedProviders || []);
      setAgentStep(4);
      
      // Transition to providers view
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentView('providers');

    } catch (error: any) {
      alert('Request Failed: ' + error.message);
      setAgentStep(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Book provider ────────────────────────────────────────────────────────────
  const bookProvider = async (provider: any) => {
    setBookingLoading(true);
    try {
      const res = await fetch('http://192.168.18.143:8000/api/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provider.id, user_id: 'user-123', service: intentData.service }),
      });
      const data = await res.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setBookingId(data.booking_id);
      setBookedProvider(provider);
      setCurrentView('success');
    } catch (err) {
      alert('Failed to book provider.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Render Helpers ───────────────────────────────────────────────────────────
  const renderAgentStep = (title: string, desc: string, status: 'waiting' | 'running' | 'done') => {
    return (
      <View style={[styles.agentRow, status === 'running' && styles.agentRowRunning]}>
        <View style={styles.agentIconCol}>
          {status === 'done' && <Ionicons name="checkmark-circle" size={16} color={C.green} style={{marginTop: 2}} />}
          {status === 'running' && <PulsingDot />}
          {status === 'waiting' && <Ionicons name="radio-button-off" size={16} color={C.textMuted} style={{marginTop: 2}} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.agentTitle, status === 'waiting' && { color: C.textMuted }]}>{title}</Text>
          <Text style={[styles.agentDesc, status === 'waiting' && { color: C.textMuted }]}>{desc}</Text>
        </View>
      </View>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  if (currentView === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.homeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.logoBadge}><Text style={styles.logoBadgeText}>K</Text></View>
            <Text style={styles.brandTitle}>Kaamlink</Text>
          </View>
          <MaterialIcons name="g-translate" size={22} color={C.textSub} />
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={styles.sectionHeading}>What do you need?</Text>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputArea}
              placeholder="e.g. AC thanda nahi kar raha..."
              placeholderTextColor={C.textMuted}
              value={requestText}
              onChangeText={setRequestText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!requestText.trim() || loading) && { opacity: 0.5 }]} 
              onPress={sendRequest}
              disabled={loading || !requestText.trim()}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={16} color="#fff" style={{marginLeft: 2}} />}
            </TouchableOpacity>
          </View>

          {/* AI Intent Extraction */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="git-network-outline" size={14} color={C.green} />
            <Text style={styles.sectionLabel}>AI INTENT EXTRACTION</Text>
          </View>
          
          <View style={styles.intentBox}>
            {intentData ? (
              <View style={styles.chipsRow}>
                <View style={styles.chip}><Ionicons name="pricetag" size={12} color={C.textSub} /><Text style={styles.chipText}>{intentData.service}</Text></View>
                <View style={styles.chip}><Ionicons name="location" size={12} color={C.textSub} /><Text style={styles.chipText}>{intentData.location}</Text></View>
                <View style={[styles.chip, { backgroundColor: C.redDim, borderColor: C.red + '44' }]}><Ionicons name="warning" size={12} color={C.red} /><Text style={[styles.chipText, { color: C.red }]}>{intentData.urgency || 'High'}</Text></View>
                <View style={styles.chip}><Ionicons name="time" size={12} color={C.textSub} /><Text style={styles.chipText}>{intentData.preferred_time}</Text></View>
              </View>
            ) : (
              <Text style={{color: C.textMuted, fontSize: 13}}>Waiting for input...</Text>
            )}
          </View>

          {/* Agent Trace */}
          <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
            <Ionicons name="server-outline" size={14} color={C.green} />
            <Text style={styles.sectionLabel}>AGENT TRACE</Text>
          </View>
          
          <View style={styles.traceBox}>
            {renderAgentStep(
              '[INTENT AGENT]', 
              intentData ? `Extracted ${intentData.service}, ${intentData.location}, ${intentData.urgency} urgency` : 'Awaiting request processing',
              agentStep > 1 ? 'done' : agentStep === 1 ? 'running' : 'waiting'
            )}
            {renderAgentStep(
              '[DISCOVERY AGENT]' + (agentStep === 2 ? ' Running' : ''), 
              agentStep > 2 ? `Found ${providers.length} matching providers` : agentStep === 2 ? `Scanning providers in ${intentData?.location || 'area'}...` : 'Pending discovery results',
              agentStep > 2 ? 'done' : agentStep === 2 ? 'running' : 'waiting'
            )}
            {renderAgentStep(
              '[RANKING AGENT]' + (agentStep === 3 ? ' Running' : agentStep < 3 ? ' Waiting' : ''), 
              agentStep > 3 ? `Ranked ${providers.length} candidates` : 'Pending discovery results',
              agentStep > 3 ? 'done' : agentStep === 3 ? 'running' : 'waiting'
            )}
            {renderAgentStep(
              '[BOOKING AGENT]' + (agentStep === 4 ? ' Waiting' : agentStep < 4 ? ' Waiting' : ''), 
              'Pending selection',
              'waiting'
            )}
          </View>
        </ScrollView>

        {/* Mock Bottom Tabs */}
        <View style={styles.bottomTabs}>
          <View style={styles.tabItem}><Ionicons name="grid" size={20} color={C.blue} /><Text style={[styles.tabText, {color: C.blue}]}>HOME</Text></View>
          <View style={styles.tabItem}><Ionicons name="terminal-outline" size={20} color={C.textSub} /><Text style={styles.tabText}>CONSOLE</Text></View>
          <View style={styles.tabItem}><Ionicons name="chatbubble-outline" size={20} color={C.textSub} /><Text style={styles.tabText}>REQUESTS</Text></View>
          <View style={styles.tabItem}><Ionicons name="person-outline" size={20} color={C.textSub} /><Text style={styles.tabText}>ACCOUNT</Text></View>
        </View>
      </SafeAreaView>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PROVIDERS VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  if (currentView === 'providers') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setCurrentView('home')} style={{ padding: 10 }}>
            <Ionicons name="arrow-back" size={24} color={C.textSub} />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Top Recommendations</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={styles.banner}>
            <Ionicons name="flash" size={20} color={C.green} style={{ marginRight: 12 }} />
            <Text style={styles.bannerText}>
              Found <Text style={{fontWeight: '700', color: C.text}}>{providers.length} providers</Text> in <Text style={{fontWeight: '700', color: C.text}}>{intentData?.location}</Text> who match your {intentData?.urgency}-urgency {intentData?.service} request.
            </Text>
          </View>

          {providers.map((p, idx) => {
            const isTop = idx === 0;
            return (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color={C.green} style={{marginRight: 4}} />
                    <Text style={styles.ratingText}>{p.rating.toFixed(1)}</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <Ionicons name="location-outline" size={12} color={C.textSub} />
                  <Text style={styles.statText}>{p.distance}</Text>
                  <Ionicons name="time-outline" size={12} color={C.textSub} style={{marginLeft: 12}} />
                  <Text style={styles.statText}>ETA {p.eta}</Text>
                </View>

                <View style={[styles.reasoningBox, isTop && styles.reasoningBoxTop]}>
                  {isTop && <View style={styles.reasoningDot} />}
                  <Text style={styles.reasoningText}>{p.reasoning}</Text>
                </View>

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.estPriceLabel}>EST. PRICE</Text>
                    <Text style={styles.estPriceValue}>Rs. {p.base_price.toLocaleString()} - {(p.base_price + 800).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.bookBtn, isTop ? styles.bookBtnPrimary : styles.bookBtnSecondary]}
                    onPress={() => bookProvider(p)}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bookBtnText}>Select & Book</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SUCCESS VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  if (currentView === 'success' && bookedProvider) {
    const base = bookedProvider.base_price;
    const emergency = 500;
    const platform = 50;
    const total = base + emergency + platform;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => { setAgentStep(0); setCurrentView('home'); }} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={C.textSub} />
          </TouchableOpacity>
          <View style={styles.liveTrackingPill}>
            <View style={styles.liveTrackingDot} />
            <Text style={styles.liveTrackingText}>LIVE TRACKING</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={styles.successHero}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark-circle-outline" size={48} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed</Text>
            <Text style={styles.successSubtitle}>Zahid technician aapki taraf nikal chuke hain.</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.trackBtn}>
              <Ionicons name="locate" size={18} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.trackBtnText}>Track Live</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call-outline" size={20} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.providerSummaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryAvatar}>
                <Text style={styles.summaryAvatarText}>{bookedProvider.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.summaryName}>{bookedProvider.name}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                  <Ionicons name="star" size={10} color={C.textSub} style={{marginRight: 4}} />
                  <Text style={styles.summaryRating}>{bookedProvider.rating.toFixed(1)} (120 reviews)</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />

            <View style={styles.summaryDetailRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.summaryValue}>{intentData?.service || 'AC General Service'}</Text>
                <Text style={styles.summaryEmergency}>(Emergency)</Text>
              </View>
            </View>
            
            <View style={[styles.summaryDetailRow, { marginTop: 16 }]}>
              <Text style={styles.summaryLabel}>Arrival ETA</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="time-outline" size={16} color={C.green} style={{marginRight: 6}} />
                <Text style={styles.summaryETA}>{bookedProvider.eta}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryLocationRow}>
              <Ionicons name="location-outline" size={16} color={C.textSub} style={{marginRight: 8}} />
              <Text style={styles.summaryLocationText}>House 44, Street 12, {intentData?.location || 'G-13/2'}</Text>
              <Text style={styles.summaryHomeTag}>HOME</Text>
            </View>
          </View>

          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Service Receipt</Text>
              <Text style={styles.receiptId}>#{bookingId?.split('-')[0].toUpperCase() || 'KL-8829-GX'}</Text>
            </View>
            
            <View style={styles.receiptRow}><Text style={styles.receiptItem}>Base Charge</Text><Text style={styles.receiptAmt}>Rs. {base.toLocaleString()}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptItem}>Emergency Fee</Text><Text style={styles.receiptAmt}>Rs. {emergency}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptItem}>Platform Fee</Text><Text style={styles.receiptAmt}>Rs. {platform}</Text></View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Est. Total</Text>
              <Text style={styles.receiptTotalAmt}>Rs. {total.toLocaleString()}</Text>
            </View>
            <Text style={styles.receiptDisclaimer}>Final amount may vary based on parts</Text>
          </View>

          <TouchableOpacity style={{ alignSelf: 'center', marginTop: 20, marginBottom: 40 }} onPress={() => { setAgentStep(0); setCurrentView('home'); }}>
            <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '500' }}>Cancel Booking</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  
  // Home Header
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  logoBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A2133', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#2A3347' },
  logoBadgeText: { color: C.blue, fontSize: 16, fontWeight: '800' },
  brandTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  
  sectionHeading: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 16, marginTop: 10 },
  
  // Input
  inputWrapper: { position: 'relative', marginBottom: 24 },
  inputArea: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, paddingRight: 60, minHeight: 100, fontSize: 15, color: C.text, textAlignVertical: 'top', lineHeight: 22 },
  sendBtn: { position: 'absolute', right: 12, bottom: 12, width: 36, height: 36, borderRadius: 12, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' },
  
  // Sections
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: C.textSub, letterSpacing: 1, marginLeft: 8 },
  
  // Intent Box
  intentBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 12, fontWeight: '600', color: C.text, marginLeft: 6 },
  
  // Trace Box
  traceBox: { backgroundColor: '#0F121A', borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 40 },
  agentRow: { flexDirection: 'row', marginBottom: 16 },
  agentRowRunning: { backgroundColor: '#1A2B4C', padding: 12, borderRadius: 12, marginHorizontal: -12, marginTop: -4, marginBottom: 12, borderWidth: 1, borderColor: C.blue + '55' },
  agentIconCol: { width: 24, alignItems: 'center', marginRight: 8 },
  agentTitle: { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 4 },
  agentDesc: { fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 18 },
  
  // Bottom Tabs
  bottomTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: C.textSub, marginTop: 4, letterSpacing: 0.5 },

  // Sub Header
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  subHeaderTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  
  // Banner
  banner: { flexDirection: 'row', backgroundColor: '#16232E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#23384A', marginBottom: 20 },
  bannerText: { flex: 1, fontSize: 13, color: '#A5C4DB', lineHeight: 20 },

  // Provider Card
  providerCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  providerName: { fontSize: 16, fontWeight: '700', color: C.text },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162D24', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#204736' },
  ratingText: { fontSize: 12, fontWeight: '700', color: C.green },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statText: { fontSize: 12, color: C.textSub, marginLeft: 6 },
  reasoningBox: { backgroundColor: C.surfaceAlt, padding: 12, borderRadius: 10, marginBottom: 16 },
  reasoningBoxTop: { backgroundColor: '#1A2433', borderWidth: 1, borderColor: '#2B3F5B' },
  reasoningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38BDF8', position: 'absolute', left: 12, top: 18 },
  reasoningText: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginLeft: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estPriceLabel: { fontSize: 10, fontWeight: '700', color: C.textSub, letterSpacing: 1, marginBottom: 4 },
  estPriceValue: { fontSize: 14, fontWeight: '700', color: C.text },
  bookBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  bookBtnPrimary: { backgroundColor: C.blue },
  bookBtnSecondary: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  bookBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Success Screen
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  liveTrackingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162D24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#204736' },
  liveTrackingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, marginRight: 6 },
  liveTrackingText: { fontSize: 10, fontWeight: '800', color: C.green, letterSpacing: 1 },
  successHero: { alignItems: 'center', marginVertical: 30 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#162D24', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#204736' },
  successTitle: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: C.textSub },
  
  actionRow: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  trackBtn: { flex: 1, flexDirection: 'row', backgroundColor: C.blue, paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trackBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  callBtn: { width: 56, height: 56, backgroundColor: C.surface, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },

  providerSummaryCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A2B4C', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  summaryAvatarText: { fontSize: 16, fontWeight: '700', color: '#60A5FA' },
  summaryName: { fontSize: 16, fontWeight: '600', color: C.text },
  summaryRating: { fontSize: 12, color: C.textSub },
  summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  summaryDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 13, color: C.textSub },
  summaryValue: { fontSize: 15, fontWeight: '600', color: C.text },
  summaryEmergency: { fontSize: 11, color: C.red, marginTop: 4 },
  summaryETA: { fontSize: 16, fontWeight: '700', color: C.green },
  summaryLocationRow: { flexDirection: 'row', alignItems: 'center' },
  summaryLocationText: { flex: 1, fontSize: 12, color: C.textSub },
  summaryHomeTag: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1 },

  receiptCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  receiptTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  receiptId: { fontSize: 11, color: C.textSub, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptItem: { fontSize: 13, color: C.textSub },
  receiptAmt: { fontSize: 13, color: C.text, fontWeight: '500' },
  receiptDivider: { height: 1, backgroundColor: C.border, marginVertical: 16, borderStyle: 'dashed' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptTotalLabel: { fontSize: 14, color: C.textSub },
  receiptTotalAmt: { fontSize: 24, fontWeight: '700', color: C.text },
  receiptDisclaimer: { fontSize: 10, color: C.textMuted, textAlign: 'right' },
});
