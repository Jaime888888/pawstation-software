import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { dispenseNow, getDaily, getStatus, PawStationApiError, updateSettings } from './src/api/pawstation';
import SectionCard from './src/components/SectionCard';
import HistoryChart from './src/components/HistoryChart';
import VideoStreamCard from './src/components/VideoStreamCard';
import { useStatusPolling } from './src/hooks/useStatusPolling';
import { getStoredValue, setStoredValue } from './src/storage';

const VIDEO_STREAM_URL = 'https://pawstation-cam.local/stream';
const DAY_OPTIONS = [7, 14, 30];

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const [piIp, setPiIp] = useState('');
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [status, setStatus] = useState(null);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [daysToShow, setDaysToShow] = useState(7);
  const [message, setMessage] = useState('Enter the Raspberry Pi IP and tap Connect.');
  const [errorText, setErrorText] = useState('');
  const [hourInput, setHourInput] = useState('');
  const [minuteInput, setMinuteInput] = useState('');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSavedSettings() {
      const savedIp = await getStoredValue('pawstation.pi_ip', '');
      if (active) {
        setPiIp(savedIp);
        setReady(true);
      }
    }

    loadSavedSettings();

    return () => {
      active = false;
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!piIp.trim()) {
      return;
    }

    try {
      const nextStatus = await getStatus(piIp);
      setStatus(nextStatus);
      setOnline(true);
      setErrorText('');
    } catch (error) {
      setOnline(false);
      setErrorText(error.message || 'Could not reach PawStation.');
    }
  }, [piIp]);

  useStatusPolling({
    enabled: connected,
    intervalMs: 3000,
    action: refreshStatus,
  });

  const loadHistory = useCallback(async () => {
    if (!piIp.trim()) {
      return;
    }

    try {
      const daily = await getDaily(piIp);
      setDailyEntries(Array.isArray(daily.entries) ? daily.entries : []);
      setErrorText('');
    } catch (error) {
      setErrorText(error.message || 'Could not load daily history.');
    }
  }, [piIp]);

  const connectToDevice = async () => {
    const cleanIp = piIp.trim();
    if (!cleanIp) {
      setErrorText('Enter the Raspberry Pi IP address first.');
      return;
    }

    setConnecting(true);
    setMessage('Connecting to PawStation...');
    setErrorText('');

    try {
      const firstStatus = await getStatus(cleanIp);
      setStatus(firstStatus);
      setConnected(true);
      setOnline(true);
      setMessage(`Connected to ${cleanIp}`);
      await setStoredValue('pawstation.pi_ip', cleanIp);
      const daily = await getDaily(cleanIp);
      setDailyEntries(Array.isArray(daily.entries) ? daily.entries : []);
    } catch (error) {
      const nextError = error instanceof PawStationApiError ? error.message : 'Connection failed.';
      setConnected(false);
      setOnline(false);
      setErrorText(nextError);
      setMessage('Cannot connect to PawStation.');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualFeed = async () => {
    if (!connected) {
      return;
    }

    setBusyAction('feed');
    setErrorText('');
    try {
      await dispenseNow(piIp);
      setMessage('Manual feed requested.');
      await refreshStatus();
      await loadHistory();
    } catch (error) {
      setErrorText(error.message || 'Manual feed failed.');
    } finally {
      setBusyAction('');
    }
  };

  const handleSaveTime = async () => {
    const hour = Number(hourInput);
    const minute = Number(minuteInput);

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setErrorText('Use a valid hour 0-23 and minute 0-59.');
      return;
    }

    setBusyAction('time');
    setErrorText('');
    try {
      await updateSettings(piIp, { feed_hour: hour, feed_min: minute });
      setMessage(`Saved feed time ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      setHourInput('');
      setMinuteInput('');
      await refreshStatus();
    } catch (error) {
      setErrorText(error.message || 'Saving feed time failed.');
    } finally {
      setBusyAction('');
    }
  };

  const handleSaveAmount = async () => {
    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount < 10 || amount > 1000) {
      setErrorText('Use a target amount between 10 and 1000 grams.');
      return;
    }

    setBusyAction('amount');
    setErrorText('');
    try {
      await updateSettings(piIp, { target_g: amount });
      setMessage(`Saved target amount ${amount} g`);
      setAmountInput('');
      await refreshStatus();
    } catch (error) {
      setErrorText(error.message || 'Saving amount failed.');
    } finally {
      setBusyAction('');
    }
  };

  const statusSummary = useMemo(() => {
    if (!status) {
      return {
        bowl: '--',
        tank: '--',
        feedTime: '--',
        amount: '--',
        state: '--',
        deviceTime: '--',
        motorOn: false,
      };
    }

    const bowl = Number(status.bowl_g || 0);
    const tank = Number(status.tank_g || 0);
    const feedHour = Number(status.feed_hour || 0);
    const feedMin = Number(status.feed_min || 0);
    const target = Number(status.target_g || 0);
    const motorOn = Boolean(status.motor_on);

    return {
      bowl: `${bowl.toFixed(1)} g`,
      tank: `${(tank / 1000).toFixed(2)} kg`,
      feedTime: `${String(feedHour).padStart(2, '0')}:${String(feedMin).padStart(2, '0')}`,
      amount: `${target.toFixed(1)} g`,
      state: motorOn ? 'Dispensing...' : String(status.state || 'MAIN'),
      deviceTime: String(status.iso_time || '--'),
      motorOn,
    };
  }, [status]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading PawStation app...</Text>
      </SafeAreaView>
    );
  }

  const disableManualFeed = !connected || !online || statusSummary.motorOn || busyAction === 'feed';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>PawStation</Text>
        <Text style={styles.subheading}>Live feeder control, feeding history, and camera access.</Text>

        <SectionCard title="Connection">
          <Text style={styles.fieldLabel}>Raspberry Pi IP address</Text>
          <TextInput
            value={piIp}
            onChangeText={setPiIp}
            placeholder="192.168.1.50"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable style={[styles.primaryButton, connecting && styles.buttonDisabled]} onPress={connectToDevice} disabled={connecting}>
            <Text style={styles.primaryButtonText}>{connecting ? 'Connecting...' : 'Connect'}</Text>
          </Pressable>
          <Text style={[styles.connectionState, { color: online ? '#047857' : '#b45309' }]}>
            {connected ? (online ? 'Device online' : 'Trying to reconnect...') : 'Not connected'}
          </Text>
          <Text style={styles.helperText}>{message}</Text>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </SectionCard>

        <SectionCard title="Dashboard">
          <View style={styles.statsGrid}>
            <StatBox label="Food in bowl" value={statusSummary.bowl} />
            <StatBox label="Tank level" value={statusSummary.tank} />
            <StatBox label="Feed time" value={statusSummary.feedTime} />
            <StatBox label="Feed amount" value={statusSummary.amount} />
            <StatBox label="Status" value={statusSummary.state} />
            <StatBox label="Device time" value={statusSummary.deviceTime} />
          </View>
        </SectionCard>

        <SectionCard title="Controls">
          <Pressable style={[styles.primaryButton, disableManualFeed && styles.buttonDisabled]} onPress={handleManualFeed} disabled={disableManualFeed}>
            <Text style={styles.primaryButtonText}>{busyAction === 'feed' ? 'Sending...' : 'Manual Feed'}</Text>
          </Pressable>
          <Text style={styles.helperText}>Manual feed is disabled while the motor is already running.</Text>

          <View style={styles.inlineRow}>
            <View style={styles.inlineField}>
              <Text style={styles.fieldLabel}>Hour</Text>
              <TextInput value={hourInput} onChangeText={setHourInput} placeholder="8" keyboardType="number-pad" style={styles.input} />
            </View>
            <View style={styles.inlineField}>
              <Text style={styles.fieldLabel}>Minute</Text>
              <TextInput value={minuteInput} onChangeText={setMinuteInput} placeholder="30" keyboardType="number-pad" style={styles.input} />
            </View>
          </View>
          <Pressable style={[styles.secondaryButton, busyAction === 'time' && styles.buttonDisabled]} onPress={handleSaveTime} disabled={busyAction === 'time'}>
            <Text style={styles.secondaryButtonText}>{busyAction === 'time' ? 'Saving...' : 'Save Time'}</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Target grams</Text>
          <TextInput value={amountInput} onChangeText={setAmountInput} placeholder="120" keyboardType="decimal-pad" style={styles.input} />
          <Pressable style={[styles.secondaryButton, busyAction === 'amount' && styles.buttonDisabled]} onPress={handleSaveAmount} disabled={busyAction === 'amount'}>
            <Text style={styles.secondaryButtonText}>{busyAction === 'amount' ? 'Saving...' : 'Save Amount'}</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="History">
          <View style={styles.daySelectorRow}>
            {DAY_OPTIONS.map((days) => (
              <Pressable
                key={days}
                style={[styles.dayChip, daysToShow === days && styles.dayChipActive]}
                onPress={() => setDaysToShow(days)}
              >
                <Text style={[styles.dayChipText, daysToShow === days && styles.dayChipTextActive]}>{days} days</Text>
              </Pressable>
            ))}
            <Pressable style={styles.refreshLink} onPress={loadHistory}>
              <Text style={styles.refreshLinkText}>Refresh</Text>
            </Pressable>
          </View>
          <HistoryChart entries={dailyEntries} daysToShow={daysToShow} />
        </SectionCard>

        <SectionCard title="Camera Stream">
          <VideoStreamCard videoUrl={VIDEO_STREAM_URL} />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 16,
  },
  container: {
    padding: 18,
    paddingBottom: 30,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subheading: {
    color: '#4b5563',
    marginBottom: 18,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  connectionState: {
    marginTop: 12,
    fontWeight: '700',
  },
  helperText: {
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 8,
  },
  errorText: {
    marginTop: 10,
    color: '#b91c1c',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    color: '#6b7280',
    marginBottom: 6,
    fontSize: 13,
  },
  statValue: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 18,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  daySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dayChipActive: {
    backgroundColor: '#2563eb',
  },
  dayChipText: {
    color: '#374151',
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: '#ffffff',
  },
  refreshLink: {
    marginLeft: 'auto',
  },
  refreshLinkText: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
