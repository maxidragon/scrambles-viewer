import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ViewerScreen } from '../screens/ViewerScreen';

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Viewer: { initialIndex: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#003087' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'Back',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Scrambles Viewer' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Search Competition' }}
        />
        <Stack.Screen
          name="Viewer"
          component={ViewerScreen}
          options={{ title: 'Scramble Sets', headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
