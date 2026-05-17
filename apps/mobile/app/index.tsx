import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 12, letterSpacing: 2, color: '#0F4D2C' }}>FEERA</Text>
        <Text style={{ fontSize: 40, fontWeight: '600', color: '#1A1A1A' }}>Padel, properly.</Text>
        <Text style={{ fontSize: 16, color: '#555', lineHeight: 24 }}>
          Booking, matchmaking, rankings, tournaments. One platform from Lahore to Lisbon.
        </Text>
        <Text style={{ fontSize: 12, color: '#888' }}>Scaffold online. M1 in progress.</Text>
      </View>
    </SafeAreaView>
  );
}
