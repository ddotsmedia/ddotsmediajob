import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { api, formatSalary } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Jobs'>;

export function JobsScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const jobs = useQuery({ queryKey: ['jobs', search], queryFn: () => api.listJobs({ q: search || undefined }) });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSearch(q)}
          placeholder="Search jobs in the UAE"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          returnKeyType="search"
        />
      </View>

      {jobs.isLoading ? (
        <ActivityIndicator color="#339a9b" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs.data?.jobs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('JobDetail', { slug: item.slug, title: item.title })}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.company}>{item.company?.name ?? 'Confidential'}</Text>
              <Text style={styles.salary}>
                {formatSalary(item.salaryMin, item.salaryMax, item.salaryPeriod, item.salaryHidden)}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No jobs found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f4' },
  searchRow: { padding: 12, backgroundColor: '#0d2e2d' },
  input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#0d2e2d' },
  company: { color: '#5b7a79', marginTop: 2 },
  salary: { color: '#266465', fontWeight: '600', marginTop: 6 },
  empty: { textAlign: 'center', color: '#5b7a79', marginTop: 40 },
});
