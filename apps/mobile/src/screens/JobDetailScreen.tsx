import { ScrollView, View, Text, ActivityIndicator, Linking, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { api, formatSalary } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

export function JobDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const job = useQuery({ queryKey: ['job', slug], queryFn: () => api.jobBySlug(slug) });

  if (job.isLoading) return <ActivityIndicator color="#339a9b" style={{ marginTop: 40 }} />;
  if (!job.data) return <Text style={styles.empty}>Job not found.</Text>;
  const j = job.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{j.title}</Text>
      <Text style={styles.company}>{j.company?.name ?? 'Confidential'}</Text>
      <Text style={styles.salary}>{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden)}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{j.location ?? j.emirateSlug}</Text>
        <Text style={styles.meta}>{String(j.jobType).replace('-', ' ')}</Text>
      </View>

      <Text style={styles.body}>{j.description}</Text>

      <TouchableOpacity
        style={styles.apply}
        onPress={() => Linking.openURL(`https://ddotsmediajobs.com/jobs/${slug}`)}
      >
        <Text style={styles.applyText}>Apply on DdotsMediaJobs</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#0d2e2d' },
  company: { color: '#5b7a79', marginTop: 4, fontSize: 15 },
  salary: { color: '#266465', fontWeight: '700', marginTop: 8, fontSize: 16 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  meta: { color: '#5b7a79', textTransform: 'capitalize' },
  body: { marginTop: 16, color: '#1e293b', lineHeight: 22 },
  apply: { backgroundColor: '#ea7a3c', borderRadius: 12, padding: 16, marginTop: 24, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { textAlign: 'center', color: '#5b7a79', marginTop: 40 },
});
