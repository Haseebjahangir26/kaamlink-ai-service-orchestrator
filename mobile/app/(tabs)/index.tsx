import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

export default function HomeScreen() {
  const [requestText, setRequestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentData, setIntentData] = useState(null);
  const [providers, setProviders] = useState([]);
  const [bookingId, setBookingId] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Poll for logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/logs');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setLogs(data);
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    };
    
    fetchLogs();
    const intervalId = setInterval(fetchLogs, 2000);
    return () => clearInterval(intervalId);
  }, []);

  const sendRequest = async () => {
    if (!requestText.trim()) return;
    
    setLoading(true);
    setIntentData(null);
    setProviders([]);
    setBookingId(null);
    try {
      // 1. Get Intent
      const intentRes = await fetch('http://127.0.0.1:8000/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requestText }),
      });
      if (!intentRes.ok) {
        throw new Error(await intentRes.text());
      }
      const intent = await intentRes.json();
      setIntentData(intent);

      // 2. Discover Providers
      const providersRes = await fetch('http://127.0.0.1:8000/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (!providersRes.ok) {
        throw new Error(await providersRes.text());
      }
      const providersList = await providersRes.json();
      setProviders(providersList || []);

    } catch (error) {
      console.error(error);
      alert('Request Failed: ' + error.message);
    } finally {
      setLoading(false);
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
      <Text style={styles.header}>Kaamlink</Text>
      <Text style={styles.subHeader}>Service Orchestrator</Text>

      {/* Agent Trace Panel */}
      <View style={styles.tracePanel}>
        <Text style={styles.traceHeader}>Live Agent Trace ⚡</Text>
        <ScrollView style={styles.traceScroll}>
          {logs.map((log, idx) => (
            <View key={log.id || idx} style={styles.logItem}>
              <Text style={styles.logAgent}>[{log.agent_name}]</Text>
              <Text style={styles.logDecision}>{log.decision}</Text>
              {log.reasoning && <Text style={styles.logReasoning}>{log.reasoning}</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Apna masla batayein (e.g. AC thanda nahi kar raha)"
          value={requestText}
          onChangeText={setRequestText}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={sendRequest} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Find Provider</Text>
          )}
        </TouchableOpacity>
      </View>

      {intentData && !bookingId && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>Top Ranked Providers</Text>
          {providers.length === 0 ? (
            <Text style={styles.resultText}>No providers found for this service/location.</Text>
          ) : (
            providers.map((p) => (
              <View key={p.id} style={styles.providerCard}>
                <View>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Text style={styles.providerDetails}>⭐ {p.rating} | 📍 {p.location}</Text>
                  <Text style={styles.providerDetails}>Base Price: Rs. {p.base_price}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.bookBtn} 
                  onPress={() => bookProvider(p.id)}
                  disabled={bookingLoading}
                >
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {bookingId && (
        <View style={styles.receiptCard}>
          <Text style={styles.receiptHeader}>✅ Booking Confirmed</Text>
          <Text style={styles.receiptText}>Your booking ID is: {bookingId}</Text>
          <Text style={styles.receiptText}>Service: {intentData.service}</Text>
          <TouchableOpacity style={styles.button} onPress={() => {setBookingId(null); setIntentData(null); setProviders([]); setRequestText('');}}>
            <Text style={styles.buttonText}>Make another request</Text>
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
    backgroundColor: '#f0f2f5',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#005ac2',
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tracePanel: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    height: 150,
  },
  traceHeader: {
    color: '#4af626',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  traceScroll: {
    flex: 1,
  },
  logItem: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
  },
  logAgent: {
    color: '#b76dff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logDecision: {
    color: '#fff',
    fontSize: 13,
  },
  logReasoning: {
    color: '#aaa',
    fontSize: 11,
    fontStyle: 'italic',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#005ac2',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    width: '100%',
  },
  resultHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  providerCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#005ac2',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerDetails: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  bookBtn: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  receiptCard: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  receiptHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 10,
  },
  receiptText: {
    fontSize: 16,
    color: '#155724',
    marginBottom: 15,
  },
  resultText: {
    color: '#444',
    fontStyle: 'italic',
  }
});
