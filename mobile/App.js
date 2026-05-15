import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

export default function App() {
  const [requestText, setRequestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentData, setIntentData] = useState(null);

  const sendRequest = async () => {
    if (!requestText.trim()) return;
    
    setLoading(true);
    setIntentData(null);
    try {
      // Using 127.0.0.1 so it works in the web emulator test
      const response = await fetch('http://127.0.0.1:8000/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: requestText }),
      });
      
      const data = await response.json();
      setIntentData(data);
    } catch (error) {
      console.error(error);
      alert('Failed to connect to backend. Make sure the FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Kaamlink</Text>
      <Text style={styles.subHeader}>Service Orchestrator</Text>

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

      {intentData && (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultHeader}>Extracted Intent:</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}><Text style={styles.bold}>Service:</Text> {intentData.service}</Text>
            <Text style={styles.resultText}><Text style={styles.bold}>Issue:</Text> {intentData.issue}</Text>
            <Text style={styles.resultText}><Text style={styles.bold}>Location:</Text> {intentData.location}</Text>
            <Text style={styles.resultText}><Text style={styles.bold}>Urgency:</Text> {intentData.urgency}</Text>
            <Text style={styles.resultText}><Text style={styles.bold}>Time:</Text> {intentData.preferred_time}</Text>
            <Text style={styles.resultText}><Text style={styles.bold}>Confidence:</Text> {Math.round(intentData.confidence * 100)}%</Text>
          </View>
          <TouchableOpacity style={styles.bidButton}>
            <Text style={styles.buttonText}>Simulate Bids</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 30,
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
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#005ac2',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    flex: 1,
    width: '100%',
  },
  resultHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#b76dff',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultText: {
    fontSize: 15,
    marginBottom: 5,
    color: '#444',
  },
  bold: {
    fontWeight: 'bold',
    color: '#222',
  },
  bidButton: {
    backgroundColor: '#b76dff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  }
});
