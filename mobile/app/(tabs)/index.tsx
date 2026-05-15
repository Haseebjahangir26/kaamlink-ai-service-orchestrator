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
    const intervalId = setInterval(fetchLogs, 1500);
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
      const intentRes = await fetch('http://127.0.0.1:8000/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requestText }),
      });
      if (!intentRes.ok) throw new Error(await intentRes.text());
      const intent = await intentRes.json();
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIntentData(intent);

      const providersRes = await fetch('http://127.0.0.1:8000/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (!providersRes.ok) throw new Error(await providersRes.text());
      const providersList = await providersRes.json();
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        <Text style={styles.subHeader}>Service Orchestrator</Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Describe Your Issue</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. AC thanda nahi kar raha, G-13 me a jao"
          placeholderTextColor="#94a3b8"
          value={requestText}
          onChangeText={setRequestText}
          multiline
        />
        <TouchableOpacity style={styles.buttonPrimary} onPress={sendRequest} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>Find Provider</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tracePanel}>
        <View style={styles.traceHeaderRow}>
          <Text style={styles.traceHeader}>System Activity Log</Text>
          {(loading || isDiscovering) && <ActivityIndicator size="small" color="#64748b" />}
        </View>
        <ScrollView style={styles.traceScroll}>
          {logs.length === 0 && <Text style={styles.logReasoning}>System idle.</Text>}
          {logs.map((log, idx) => (
            <View key={log.id || idx} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logAgent}>{log.agent_name}</Text>
              </View>
              <Text style={styles.logDecision}>{log.decision}</Text>
              {log.reasoning && <Text style={styles.logReasoning}>{log.reasoning}</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {intentData && !bookingId && (
        <View style={styles.resultContainer}>
          <View style={styles.intentSummary}>
            <Text style={styles.intentSummaryText}>
              Extracted Intent: <Text style={styles.strong}>{intentData.service}</Text> in <Text style={styles.strong}>{intentData.location}</Text>
            </Text>
          </View>
          
          <Text style={styles.sectionTitle}>Available Providers</Text>
          {providers.length === 0 && !isDiscovering ? (
            <Text style={styles.emptyState}>No providers available for this criteria.</Text>
          ) : (
            providers.map((p) => (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.providerInfoRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.providerDetailsCol}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    <View style={styles.badgeRow}>
                      <Text style={styles.badgeText}>⭐ {p.rating} / 5.0</Text>
                      <Text style={styles.badgeText}>•</Text>
                      <Text style={styles.badgeText}>📍 {p.location}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.providerActionRow}>
                  <Text style={styles.priceText}>Base Rate: <Text style={styles.strong}>Rs. {p.base_price}</Text></Text>
                  <TouchableOpacity 
                    style={styles.bookBtn} 
                    onPress={() => bookProvider(p.id)}
                    disabled={bookingLoading}
                  >
                    <Text style={styles.bookBtnText}>Book Service</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {bookingId && (
        <View style={styles.receiptCard}>
          <Text style={styles.receiptHeader}>Booking Confirmed</Text>
          <View style={styles.receiptDetails}>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Booking ID:</Text> {bookingId}
            </Text>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Service:</Text> {intentData.service}
            </Text>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status:</Text> <Text style={styles.statusSuccess}>Active</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.buttonOutline} onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setBookingId(null); 
            setIntentData(null); 
            setProviders([]); 
            setRequestText('');
          }}>
            <Text style={styles.buttonTextOutline}>New Request</Text>
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
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 50,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subHeader: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    fontSize: 15,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  tracePanel: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    height: 180,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  traceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 8,
  },
  traceHeader: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  traceScroll: {
    flex: 1,
  },
  logItem: {
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logAgent: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  logDecision: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  logReasoning: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  resultContainer: {
    width: '100%',
  },
  intentSummary: {
    backgroundColor: '#e0e7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  intentSummaryText: {
    color: '#3730a3',
    fontSize: 14,
  },
  strong: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyState: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  providerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  providerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  providerDetailsCol: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#64748b',
    fontSize: 13,
    marginRight: 8,
  },
  providerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  priceText: {
    color: '#475569',
    fontSize: 14,
  },
  bookBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  bookBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  receiptHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  receiptDetails: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  receiptRow: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  receiptLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  statusSuccess: {
    color: '#10b981',
    fontWeight: '600',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    width: '100%',
  },
  buttonTextOutline: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  }
});
