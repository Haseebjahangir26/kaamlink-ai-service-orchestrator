import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function HomeScreen() {
  const [requestText, setRequestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentData, setIntentData] = useState(null);
  const [providers, setProviders] = useState([]);
  const [bookingId, setBookingId] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/logs');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Only update if logs changed to prevent unnecessary re-renders
            if (JSON.stringify(data) !== JSON.stringify(logs)) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setLogs(data);
            }
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    };
    
    fetchLogs();
    const intervalId = setInterval(fetchLogs, 1500); // Poll faster for the "live" effect
    return () => clearInterval(intervalId);
  }, [logs]);

  const sendRequest = async () => {
    if (!requestText.trim()) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    setIntentData(null);
    setProviders([]);
    setBookingId(null);
    setIsDiscovering(true);
    
    try {
      // 1. Get Intent
      const intentRes = await fetch('http://127.0.0.1:8000/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requestText }),
      });
      if (!intentRes.ok) throw new Error(await intentRes.text());
      const intent = await intentRes.json();
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIntentData(intent);

      // 2. Discover Providers (this will take ~5 seconds due to dramatic delays)
      const providersRes = await fetch('http://127.0.0.1:8000/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (!providersRes.ok) throw new Error(await providersRes.text());
      const providersList = await providersRes.json();
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setProviders(providersList || []);

    } catch (error) {
      console.error(error);
      alert('Request Failed: ' + error.message);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false);
      setIsDiscovering(false);
    }
  };

  const bookProvider = async (providerId) => {
    setBookingLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          user_id: "user-123",
          service: intentData.service
        }),
      });
      const data = await res.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setBookingId(data.booking_id);
    } catch (err) {
      console.error(err);
      alert('Failed to book provider.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.header}>Kaamlink</Text>
        <Text style={styles.subHeader}>AI Service Orchestrator</Text>
      </View>

      {/* Agent Trace Panel */}
      <View style={styles.tracePanel}>
        <View style={styles.traceHeaderRow}>
          <Text style={styles.traceHeader}>Live Agent Trace</Text>
          {(loading || isDiscovering) && <ActivityIndicator size="small" color="#00f2fe" />}
        </View>
        <ScrollView style={styles.traceScroll}>
          {logs.length === 0 && <Text style={styles.logReasoning}>Waiting for action...</Text>}
          {logs.map((log, idx) => (
            <View key={log.id || idx} style={styles.logItem}>
              <Text style={styles.logAgent}>[{log.agent_name}]</Text>
              <Text style={styles.logDecision}>{log.decision}</Text>
              {log.reasoning && <Text style={styles.logReasoning}>↳ {log.reasoning}</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Apna masla batayein (e.g. AC thanda nahi kar raha)"
          placeholderTextColor="#64748b"
          value={requestText}
          onChangeText={setRequestText}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={sendRequest} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>FIND PROVIDER</Text>
          )}
        </TouchableOpacity>
      </View>

      {intentData && !bookingId && (
        <View style={styles.resultContainer}>
          <View style={styles.intentPill}>
            <Text style={styles.intentPillText}>🎯 {intentData.service} in {intentData.location}</Text>
          </View>
          
          <Text style={styles.resultHeader}>Top Ranked Providers</Text>
          {providers.length === 0 && !isDiscovering ? (
            <Text style={styles.logReasoning}>No providers found for this service/location.</Text>
          ) : (
            providers.map((p, index) => (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.providerInfoRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.providerDetailsCol}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    <View style={styles.badgeRow}>
                      <Text style={styles.badgeText}>⭐ {p.rating}</Text>
                      {p.rating > 4.7 && <Text style={styles.premiumBadge}>PRO</Text>}
                      <Text style={styles.badgeText}>📍 {p.location}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.providerActionRow}>
                  <Text style={styles.priceText}>Rs. {p.base_price}</Text>
                  <TouchableOpacity 
                    style={styles.bookBtn} 
                    onPress={() => bookProvider(p.id)}
                    disabled={bookingLoading}
                  >
                    <Text style={styles.bookBtnText}>BOOK NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {bookingId && (
        <View style={styles.receiptCard}>
          <Text style={styles.receiptHeader}>🎉 Booking Confirmed!</Text>
          <View style={styles.receiptDetails}>
            <Text style={styles.receiptText}>ID: <Text style={styles.glowText}>{bookingId}</Text></Text>
            <Text style={styles.receiptText}>Service: {intentData.service}</Text>
          </View>
          <TouchableOpacity style={styles.buttonSecondary} onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setBookingId(null); 
            setIntentData(null); 
            setProviders([]); 
            setRequestText('');
          }}>
            <Text style={styles.buttonTextSecondary}>Start New Request</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{height: 50}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 50,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subHeader: {
    fontSize: 14,
    color: '#00f2fe',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  tracePanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 25,
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  traceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  traceHeader: {
    color: '#00f2fe',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  traceScroll: {
    flex: 1,
  },
  logItem: {
    marginBottom: 10,
  },
  logAgent: {
    color: '#4facfe',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  logDecision: {
    color: '#f8fafc',
    fontSize: 13,
  },
  logReasoning: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 18,
    minHeight: 100,
    fontSize: 16,
    color: '#fff',
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#00f2fe',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  intentPill: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  intentPillText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultContainer: {
    width: '100%',
  },
  resultHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
    color: '#fff',
  },
  providerCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  providerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  providerDetailsCol: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginRight: 10,
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  providerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 15,
  },
  priceText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  bookBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  receiptCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  receiptHeader: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    marginBottom: 15,
  },
  receiptDetails: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  receiptText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  glowText: {
    color: '#00f2fe',
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00f2fe',
    width: '100%',
  },
  buttonTextSecondary: {
    color: '#00f2fe',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
