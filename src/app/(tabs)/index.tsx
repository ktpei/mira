import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

import Colors from '@/constants/Colors';
import EditScreenInfo from '@/src/components/EditScreenInfo';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { testSupabaseConnection } from '@/src/server/testSupabase';

export default function FeedScreen() {
  const [isTesting, setIsTesting] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    // Test Supabase connection on mount
    testSupabaseConnection();
  }, []);

  const handleRunTest = async () => {
    setIsTesting(true);
    const result = await testSupabaseConnection();
    setIsTesting(false);
    
    if (result.success) {
      Alert.alert('✅ Test Passed', 'Supabase connection is working correctly!');
    } else {
      Alert.alert('❌ Test Failed', result.error || 'Connection test failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.tint }]}
        onPress={handleRunTest}
        disabled={isTesting}
      >
        <Text style={styles.testButtonText}>
          {isTesting ? 'Testing...' : 'Run Supabase Test'}
        </Text>
      </TouchableOpacity>
      
      <Text style={[styles.note, { color: colors.tabIconDefault }]}>
        Check console for detailed test results
      </Text>
      
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  testButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
