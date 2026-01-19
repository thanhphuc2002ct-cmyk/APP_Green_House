import { Stack } from 'expo-router';
import '../polyfills';

// Root layout đơn giản, giống cấu trúc mặc định của expo-router:
//  - Stack chính
//  - Màn hình '(tabs)' (chứa Dashboard & Settings)
//  - Màn hình 'modal'
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
