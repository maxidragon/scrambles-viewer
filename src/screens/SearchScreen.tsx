import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { searchCompetitions, fetchWCIF } from '../api/wca';
import { useCompetition } from '../store/CompetitionContext';
import { Competition } from '../types/wcif';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { setCompetition } = useCompetition();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Competition[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const comps = await searchCompetitions(query.trim());
        setResults(comps);
      } catch {
        Alert.alert('Error', 'Failed to search competitions. Check your connection.');
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    async (comp: Competition) => {
      setSelecting(comp.id);
      try {
        const wcif = await fetchWCIF(comp.id);
        await setCompetition(comp.id, comp.name, wcif);
        navigation.goBack();
      } catch {
        Alert.alert('Error', 'Failed to fetch competition data. Try again.');
      } finally {
        setSelecting(null);
      }
    },
    [setCompetition, navigation],
  );

  const formatDate = (start: string, end: string) => {
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${s} – ${e}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search competitions…"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {searching && <ActivityIndicator style={styles.spinner} color="#003087" />}
      </View>

      {results.length === 0 && !searching && query.trim().length > 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No competitions found</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect(item)}
            disabled={selecting !== null}
          >
            {selecting === item.id ? (
              <ActivityIndicator color="#003087" />
            ) : (
              <>
                <Text style={styles.compName}>{item.name}</Text>
                <Text style={styles.compMeta}>
                  {item.city_name}, {item.country_iso2}
                </Text>
                <Text style={styles.compDate}>
                  {formatDate(item.start_date, item.end_date)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  spinner: { marginLeft: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#999', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  compName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  compMeta: { fontSize: 13, color: '#555', marginBottom: 2 },
  compDate: { fontSize: 13, color: '#888' },
  separator: { height: 8 },
});
