import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TRIGGER_TAGS, type TriggerTag } from "../db/schema";

export type SymptomContextValue = {
  cough: boolean;
  wheeze: boolean;
  nightSymptoms: boolean;
  rescueInhalerPuffs: number;
  triggerTags: string[];
};

type Props = {
  value: SymptomContextValue;
  onChange: (value: SymptomContextValue) => void;
};

function toggleTag(tags: string[], nextTag: TriggerTag) {
  if (tags.includes(nextTag)) {
    return tags.filter((tag) => tag !== nextTag);
  }

  return [...tags, nextTag];
}

function labelForTag(tag: TriggerTag) {
  if (tag === "cold-air") {
    return "Cold air";
  }

  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function SymptomContextFields({ value, onChange }: Props) {
  const toggles: { key: keyof Pick<SymptomContextValue, "cough" | "wheeze" | "nightSymptoms">; label: string }[] = [
    { key: "cough", label: "Cough" },
    { key: "wheeze", label: "Wheeze" },
    { key: "nightSymptoms", label: "Night symptoms" },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Symptoms and context</Text>
      <Text style={styles.hint}>Quick checkboxes plus rescue inhaler use and likely triggers.</Text>

      <View style={styles.toggleGrid}>
        {toggles.map((item) => {
          const active = value[item.key];

          return (
            <Pressable
              key={item.key}
              onPress={() => onChange({ ...value, [item.key]: !active })}
              style={[styles.toggle, active && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inhalerRow}>
        <Text style={styles.label}>Rescue inhaler</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepButton, value.rescueInhalerPuffs === 0 && styles.stepButtonDisabled]}
            onPress={() =>
              onChange({
                ...value,
                rescueInhalerPuffs: Math.max(0, value.rescueInhalerPuffs - 1),
              })
            }
            disabled={value.rescueInhalerPuffs === 0}
          >
            <Text style={styles.stepText}>-</Text>
          </Pressable>
          <Text style={styles.puffValue}>{value.rescueInhalerPuffs} puffs</Text>
          <Pressable
            style={styles.stepButton}
            onPress={() =>
              onChange({
                ...value,
                rescueInhalerPuffs: Math.min(12, value.rescueInhalerPuffs + 1),
              })
            }
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.triggerSection}>
        <Text style={styles.label}>Triggers</Text>
        <View style={styles.triggerRow}>
          {TRIGGER_TAGS.map((tag) => {
            const active = value.triggerTags.includes(tag);

            return (
              <Pressable
                key={tag}
                onPress={() =>
                  onChange({
                    ...value,
                    triggerTags: toggleTag(value.triggerTags, tag),
                  })
                }
                style={[styles.triggerChip, active && styles.triggerChipActive]}
              >
                <Text style={[styles.triggerText, active && styles.triggerTextActive]}>
                  {labelForTag(tag)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d9e2ec",
    padding: 12,
  },
  title: {
    color: "#102a43",
    fontSize: 15,
    fontWeight: "800",
  },
  hint: {
    color: "#52606d",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  toggleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  toggle: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  toggleActive: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  toggleText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: "#991b1b",
  },
  inhalerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    color: "#334e68",
    fontSize: 13,
    fontWeight: "700",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepText: {
    color: "#0c4a6e",
    fontSize: 20,
    fontWeight: "800",
  },
  puffValue: {
    minWidth: 64,
    textAlign: "center",
    color: "#102a43",
    fontSize: 12,
    fontWeight: "800",
  },
  triggerSection: {
    marginTop: 12,
  },
  triggerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  triggerChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  triggerChipActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  triggerText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  triggerTextActive: {
    color: "#9a3412",
  },
});
