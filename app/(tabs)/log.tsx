import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Feeling = 1 | 2 | 3 | 4 | 5;

const FEELING = [
  { v: 1 as Feeling, emoji: "😫" },
  { v: 2 as Feeling, emoji: "😟" },
  { v: 3 as Feeling, emoji: "😐" },
  { v: 4 as Feeling, emoji: "🙂" },
  { v: 5 as Feeling, emoji: "😁" },
];

function clampToStep(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round((clamped - min) / step) * step + min;
}

function StepperRow(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const { label, value, onChange, min, max, step } = props;

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          onPress={() => onChange(clampToStep(value - step, min, max, step))}
          disabled={value <= min}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>

        <Text style={styles.valueText}>{value}</Text>

        <Pressable
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          onPress={() => onChange(clampToStep(value + step, min, max, step))}
          disabled={value >= max}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LogEntry() {
  const [trial1, setTrial1] = useState(400);
  const [trial2, setTrial2] = useState(400);
  const [trial3, setTrial3] = useState(400);
  const [feeling, setFeeling] = useState<Feeling>(3);

  const now = useMemo(() => new Date(), []);
  const dateStr = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [now]
  );
  const timeStr = useMemo(
    () => now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    [now]
  );

  const feelingMeta = FEELING.find((f) => f.v === feeling)!;

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.topTitle}>New reading</Text>
          <Text style={styles.topSub}>
            {dateStr} • {timeStr}
          </Text>
        </View>

        <View style={styles.feelingPill}>
          <Text style={styles.feelingEmoji}>{feelingMeta.emoji}</Text>
          <Text style={styles.feelingNum}>{feeling}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <StepperRow label="Trial 1" value={trial1} onChange={setTrial1} min={200} max={700} step={5} />
        <StepperRow label="Trial 2" value={trial2} onChange={setTrial2} min={200} max={700} step={5} />
        <StepperRow label="Trial 3" value={trial3} onChange={setTrial3} min={200} max={700} step={5} />

        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.rowLabel}>Feeling</Text>
          <View style={styles.feelingRow}>
            {FEELING.map((f) => {
              const active = f.v === feeling;
              return (
                <Pressable
                  key={f.v}
                  onPress={() => setFeeling(f.v)}
                  style={[styles.feelingBtn, active && styles.feelingBtnActive]}
                >
                  <Text style={styles.feelingBtnEmoji}>{f.emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={styles.saveBtn}
          onPress={() => {
            console.log("SAVE", { trial1, trial2, trial3, feeling });
          }}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.eventsArea} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.eventsHeader}>Events (optional)</Text>
        <Text style={styles.eventsHint}>
          Next: add expander for illness/exercise/medication/notes and save with reading.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topTitle: { fontSize: 18, fontWeight: "700" },
  topSub: { marginTop: 2, opacity: 0.7 },
  feelingPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, opacity: 0.9 },
  feelingEmoji: { fontSize: 18 },
  feelingNum: { fontSize: 14, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 14, fontWeight: "600", width: 80 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 36, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 18, fontWeight: "700" },
  valueText: { width: 54, textAlign: "center", fontSize: 16, fontWeight: "700" },
  feelingRow: { flexDirection: "row", gap: 8 },
  feelingBtn: { width: 36, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", opacity: 0.75 },
  feelingBtnActive: { opacity: 1, transform: [{ scale: 1.03 }] },
  feelingBtnEmoji: { fontSize: 16 },
  saveBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  saveBtnText: { fontSize: 16, fontWeight: "800" },
  eventsArea: { marginTop: 10, flex: 1 },
  eventsHeader: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  eventsHint: { opacity: 0.75, lineHeight: 18 },
});