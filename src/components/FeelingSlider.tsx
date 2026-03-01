import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { FeelingScore } from "../db/schema";

const FEELINGS: { value: FeelingScore; emoji: string; label: string }[] = [
  { value: 1, emoji: "😫", label: "Very bad" },
  { value: 2, emoji: "😟", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😁", label: "Great" },
];

type Props = {
  value: FeelingScore;
  onChange: (value: FeelingScore) => void;
};

export function FeelingSlider({ value, onChange }: Props) {
  const active = FEELINGS.find((item) => item.value === value) ?? FEELINGS[2];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Feeling</Text>
        <Text style={styles.meta}>
          {active.emoji} {value}/5
        </Text>
      </View>

      <View style={styles.row}>
        {FEELINGS.map((item) => {
          const isActive = item.value === value;

          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              style={[styles.button, isActive && styles.buttonActive]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={[styles.number, isActive && styles.numberActive]}>{item.value}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.caption}>{active.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#102a43",
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#52606d",
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f0f4f8",
    borderWidth: 1,
    borderColor: "#d9e2ec",
  },
  buttonActive: {
    backgroundColor: "#fff7e6",
    borderColor: "#f6ad55",
  },
  emoji: {
    fontSize: 20,
    marginBottom: 3,
  },
  number: {
    color: "#52606d",
    fontSize: 12,
    fontWeight: "700",
  },
  numberActive: {
    color: "#9c4221",
  },
  caption: {
    marginTop: 6,
    color: "#52606d",
    fontSize: 12,
    textAlign: "right",
  },
});
