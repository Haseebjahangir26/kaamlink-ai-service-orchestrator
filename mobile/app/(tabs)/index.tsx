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
      <View style={styles.appWrapper}>
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>K</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Kaamlink</Text>
            <Text style={styles.brandSubtitle}>AI Orchestrator</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.sectionHeading}>What do you need help with?</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Describe the issue (e.g. AC thanda nahi kar raha, G-13)"
            placeholderTextColor="#9CA3AF"
            value={requestText}
            onChangeText={setRequestText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.primaryActionBtn, !requestText.trim() && styles.primaryActionBtnDisabled]} 
            onPress={sendRequest} 
            disabled={loading || !requestText.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryActionBtnText}>Analyze & Find Provider</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.diagnosticCard}>
          <View style={styles.diagnosticHeader}>
            <Text style={styles.diagnosticTitle}>System Diagnostics</Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, (loading || isDiscovering) ? styles.statusDotActive : {}]} />
              <Text style={styles.statusText}>{(loading || isDiscovering) ? 'Processing' : 'Idle'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <ScrollView style={styles.logContainer}>
            {logs.length === 0 && <Text style={styles.logEmptyText}>No active operations.</Text>}
            {logs.map((log, idx) => (
              <View key={log.id || idx} style={styles.logEntry}>
                <View style={styles.logTimelineNode} />
                <View style={styles.logContent}>
                  <Text style={styles.logAgentName}>{log.agent_name}</Text>
                  <Text style={styles.logActionText}>{log.decision}</Text>
                  {log.reasoning && <Text style={styles.logMetaText}>{log.reasoning}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {intentData && !bookingId && (
          <View style={styles.resultsArea}>
            <View style={styles.intentBadge}>
              <Text style={styles.intentBadgeLabel}>Detected Intent</Text>
              <Text style={styles.intentBadgeValue}>{intentData.service} • {intentData.location}</Text>
            </View>
            
            <Text style={styles.sectionHeading}>Matched Providers</Text>
            {providers.length === 0 && !isDiscovering ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateText}>No providers match this request.</Text>
              </View>
            ) : (
              providers.map((p) => (
                <View key={p.id} style={styles.providerItem}>
                  <View style={styles.providerItemTop}>
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerAvatarText}>{p.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.providerMeta}>
                      <Text style={styles.providerTitle}>{p.name}</Text>
                      <View style={styles.providerStats}>
                        <View style={styles.ratingPill}>
                          <Text style={styles.ratingText}>★ {p.rating.toFixed(1)}</Text>
                        </View>
                        <Text style={styles.locationText}>{p.location}</Text>
                      </View>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>Base Rate</Text>
                      <Text style={styles.priceValue}>Rs. {p.base_price}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookActionBtn} 
                    onPress={() => bookProvider(p.id)}
                    disabled={bookingLoading}
                  >
                    <Text style={styles.bookActionBtnText}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {bookingId && (
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Booking Confirmed</Text>
            <Text style={styles.successDesc}>Your service request has been processed successfully.</Text>
            
            <View style={styles.receiptDataBox}>
              <View style={styles.receiptDataRow}>
                <Text style={styles.receiptDataLabel}>Reference ID</Text>
                <Text style={styles.receiptDataValue}>{bookingId.split('-')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.receiptDataRow}>
                <Text style={styles.receiptDataLabel}>Service</Text>
                <Text style={styles.receiptDataValue}>{intentData.service}</Text>
              </View>
              <View style={[styles.receiptDataRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.receiptDataLabel}>Status</Text>
                <Text style={styles.receiptStatusValue}>Awaiting Provider</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setBookingId(null); 
              setIntentData(null); 
              setProviders([]); 
              setRequestText('');
            }}>
              <Text style={styles.secondaryActionBtnText}>Create New Request</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{height: 80}} />
      </View>
    </ScrollView>
  );
}

const BRAND_COLOR = '#635BFF'; // Stripe Blurple

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Extremely light, neutral gray
  },
  appWrapper: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
    paddingTop: 64,
  },
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 40,
    height: 40,
    backgroundColor: BRAND_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: '#1F2937',
    textAlignVertical: 'top',
    marginBottom: 20,
    lineHeight: 22,
  },
  primaryActionBtn: {
    backgroundColor: '#111827', // Very dark slate for a premium feel
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  diagnosticCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    height: 220,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosticTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: BRAND_COLOR,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  logContainer: {
    flex: 1,
  },
  logEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  logTimelineNode: {
    width: 2,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
    position: 'relative',
    marginTop: 6,
  },
  logContent: {
    flex: 1,
  },
  logAgentName: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  logActionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  logMetaText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 18,
  },
  resultsArea: {
    width: '100%',
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF', // Indigo 50
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E7FF', // Indigo 100
  },
  intentBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5', // Indigo 600
    marginRight: 8,
  },
  intentBadgeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81', // Indigo 900
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  providerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  providerItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  providerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  providerMeta: {
    flex: 1,
  },
  providerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  providerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingPill: {
    backgroundColor: '#FEF3C7', // Amber 100
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309', // Amber 700
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  bookActionBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 16,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5', // Emerald 50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 32,
    color: '#10B981', // Emerald 500
    fontWeight: '300',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  receiptDataBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  receiptDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptDataLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  receiptDataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  receiptStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  secondaryActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  }
});
