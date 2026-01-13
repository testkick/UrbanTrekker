import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.secondary },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              title: 'Stepquest Explorer',
            }}
          />
          <Stack.Screen
            name="journal"
            options={{
              headerShown: false,
              title: 'Explorer Journal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              title: 'Cloud Sync',
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="auth/callback"
            options={{
              headerShown: false,
              title: 'Confirming...',
              animation: 'fade',
            }}
          />
        </Stack>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
});
