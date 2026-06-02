import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { JobsScreen } from './src/screens/JobsScreen';
import { JobDetailScreen } from './src/screens/JobDetailScreen';

export type RootStackParamList = {
  Jobs: undefined;
  JobDetail: { slug: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const TEAL = '#339a9b';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0d2e2d' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f1f5f4' },
          }}
        >
          <Stack.Screen name="Jobs" component={JobsScreen} options={{ title: 'DdotsMediaJobs' }} />
          <Stack.Screen
            name="JobDetail"
            component={JobDetailScreen}
            options={({ route }) => ({ title: route.params.title, headerTintColor: TEAL })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
