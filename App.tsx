import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CompetitionProvider } from './src/store/CompetitionContext';
import { Navigation } from './src/navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CompetitionProvider>
        <Navigation />
      </CompetitionProvider>
    </GestureHandlerRootView>
  );
}
