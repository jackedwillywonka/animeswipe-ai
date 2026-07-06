import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SwipeScreen } from '@/screens/SwipeScreen';
import { AISearchScreen } from '@/screens/AISearchScreen';
import { SavedListScreen } from '@/screens/SavedListScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { colors } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import type { RootStackParamList } from './RootNavigator';

export type MainTabParamList = {
  Swipe: undefined;
  Saved: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MainTabs() {
  const navigation = useNavigation<Nav>();
  const { userId, stats } = useAppContext();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.violetLight,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const iconName: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Swipe: 'flame',
            Saved: 'bookmark',
            Profile: 'person-circle',
          };
          return <Ionicons name={iconName[route.name as keyof MainTabParamList]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Saved">
        {() => (
          <SavedListScreen
            onSelectAnime={(anime) => navigation.navigate('Details', { animeId: anime.id })}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen username="You" stats={stats} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
