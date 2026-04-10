import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function clampHeight(value, maxValue) {
  if (maxValue <= 0) {
    return 8;
  }
  return Math.max(8, (value / maxValue) * 150);
}

export default function HistoryChart({ entries, daysToShow }) {
  const selected = [...entries].slice(0, daysToShow).reverse();
  const maxValue = Math.max(...selected.map((entry) => Number(entry.grams || 0)), 0);

  if (selected.length === 0) {
    return <Text style={styles.empty}>No feeding history available yet.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {selected.map((entry) => {
        const grams = Number(entry.grams || 0);
        return (
          <View key={`${entry.date}-${grams}`} style={styles.barGroup}>
            <Text style={styles.value}>{Math.round(grams)}g</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: clampHeight(grams, maxValue) }]} />
            </View>
            <Text style={styles.label}>{entry.date.slice(5)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 8,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  empty: {
    color: '#6b7280',
    fontSize: 14,
  },
  barGroup: {
    width: 52,
    alignItems: 'center',
    marginRight: 10,
  },
  value: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
  },
  barTrack: {
    height: 160,
    width: 28,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 14,
  },
  label: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
  },
});
