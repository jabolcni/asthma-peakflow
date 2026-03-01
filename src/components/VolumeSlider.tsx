import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MIN = 200;
const MAX = 700;
const STEP = 5;

function clamp(value: number) {
  return Math.min(MAX, Math.max(MIN, value));
}

function snap(value: number) {
  return Math.round((clamp(value) - MIN) / STEP) * STEP + MIN;
}

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function VolumeSlider({ label, value, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const percentage = useMemo(() => (value - MIN) / (MAX - MIN), [value]);
  const thumbLeft = trackWidth > 0 ? percentage * trackWidth : 0;

  const updateFromPosition = useCallback(
    (locationX: number) => {
      if (!trackWidthRef.current) {
        return;
      }

      const nextValue = (locationX / trackWidthRef.current) * (MAX - MIN) + MIN;
      onChange(snap(nextValue));
    },
    [onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromPosition(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromPosition(event.nativeEvent.locationX),
      }),
    [updateFromPosition]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} L/min</Text>
      </View>

      <Pressable
        style={styles.trackTouch}
        onPress={(event) => updateFromPosition(event.nativeEvent.locationX)}
      >
        <View style={styles.trackShell} onLayout={onLayout} {...panResponder.panHandlers}>
          <View style={[styles.trackFill, { width: `${percentage * 100}%` }]} />
          {trackWidth > 0 ? <View style={[styles.thumb, { left: thumbLeft - 12 }]} /> : null}
        </View>
      </Pressable>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{MIN}</Text>
        <Text style={styles.scaleText}>450</Text>
        <Text style={styles.scaleText}>{MAX}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    color: "#102a43",
    fontSize: 15,
    fontWeight: "700",
  },
  value: {
    color: "#0f5132",
    fontSize: 14,
    fontWeight: "700",
  },
  trackTouch: {
    paddingVertical: 10,
  },
  trackShell: {
    height: 18,
    borderRadius: 999,
    backgroundColor: "#d9e2ec",
    overflow: "visible",
    justifyContent: "center",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#2f855a",
  },
  thumb: {
    position: "absolute",
    top: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#1f6f4a",
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleText: {
    color: "#52606d",
    fontSize: 12,
    fontWeight: "600",
  },
});
