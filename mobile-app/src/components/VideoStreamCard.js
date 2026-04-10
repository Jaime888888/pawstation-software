import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function VideoStreamCard({ videoUrl }) {
  const [expanded, setExpanded] = useState(false);
  const [streamError, setStreamError] = useState('');

  const helperText = useMemo(() => {
    if (streamError) {
      return streamError;
    }
    return 'The stream opens from the separate camera module. If the embedded view does not load, use Open Stream.';
  }, [streamError]);

  const openStream = async () => {
    setStreamError('');
    const supported = await Linking.canOpenURL(videoUrl);
    if (!supported) {
      setStreamError('This device cannot open the camera stream URL.');
      return;
    }
    await Linking.openURL(videoUrl);
  };

  return (
    <View>
      <View style={styles.row}>
        <Pressable style={styles.primaryButton} onPress={() => setExpanded((value) => !value)}>
          <Text style={styles.primaryButtonText}>{expanded ? 'Hide Stream' : 'Show Stream'}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={openStream}>
          <Text style={styles.secondaryButtonText}>Open Stream</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>{helperText}</Text>
      {expanded ? (
        <View style={styles.webViewShell}>
          <WebView
            source={{ uri: videoUrl }}
            style={styles.webView}
            originWhitelist={['*']}
            onError={() => setStreamError('The in-app stream failed to load. The camera may be offline, blocked by the network, or using a certificate the device does not trust.')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  caption: {
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  webViewShell: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  webView: {
    flex: 1,
  },
});
