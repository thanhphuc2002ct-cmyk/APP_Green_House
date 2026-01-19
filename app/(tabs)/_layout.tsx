import { BottomTabBarButtonProps, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

function CustomTabButton({ children, ...props }: BottomTabBarButtonProps) {
  const focused = props.accessibilityState?.selected ?? false;
  
  return (
    <View style={focused ? styles.activeTabWrapper : undefined}>
      <PlatformPressable
        {...props}
        style={props.style}
        onPressIn={(ev) => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}>
        {children}
      </PlatformPressable>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarContainer}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={20}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />
      )}
      <View style={[styles.tabBar, { backgroundColor: 'transparent' }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icon = options.tabBarIcon
            ? options.tabBarIcon({ 
                focused: isFocused, 
                color: isFocused ? '#000000' : '#666666', 
                size: 26 
              })
            : null;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabBarItem}
            >
              <View style={isFocused ? styles.activeTabWrapper : undefined}>
                <View style={styles.tabBarIconWrap}>{icon}</View>
                  <Text style={[styles.tabBarLabel, { color: isFocused ? '#000000' : '#666666' }]}>
                    {label as string}
                  </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#666666',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Bảng điều khiển',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              size={26} 
              name="waveform.path.ecg" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              size={26} 
              name="gearshape.fill" 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    height: Platform.OS === 'ios' ? 92 : 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 180, 180, 0.1)',
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 92 : 72,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    color: '#000000',
  },
  tabBarIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeTabWrapper: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    // Hiệu ứng lõm xuống với border
    borderWidth: 1,
    borderTopColor: '#D0D0D0',
    borderLeftColor: '#D0D0D0',
    borderRightColor: '#E8E8E8',
    borderBottomColor: '#E8E8E8',
    // Shadow inset effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
