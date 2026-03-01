import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EVENT_TYPES, type EventType } from "../db/schema";

type Props = {
  eventType: EventType | null;
  note: string;
  onChange: (payload: { eventType: EventType | null; note: string }) => void;
};

const EVENT_META: Record<EventType, { label: string; color: string }> = {
  illness: { label: "Illness", color: "#d64545" },
  exercise: { label: "Exercise", color: "#d97706" },
  medication: { label: "Medication", color: "#2f855a" },
  note: { label: "General note", color: "#2563eb" },
};

export function EventExpander({ eventType, note, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const summary = useMemo(() => {
    if (!eventType) {
      return "Optional event";
    }

    const trimmed = note.trim();
    return trimmed ? `${EVENT_META[eventType].label}: ${trimmed}` : EVENT_META[eventType].label;
  }, [eventType, note]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setIsOpen((current) => !current)}>
        <View>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.summary}>{summary}</Text>
        </View>
        <Text style={styles.chevron}>{isOpen ? "v" : ">"}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.body}>
          <View style={styles.optionGrid}>
            <Pressable
              style={[styles.option, !eventType && styles.optionActive]}
              onPress={() => onChange({ eventType: null, note: "" })}
            >
              <Text style={[styles.optionText, !eventType && styles.optionTextActive]}>None</Text>
            </Pressable>

            {EVENT_TYPES.map((type) => {
              const isActive = type === eventType;
              return (
                <Pressable
                  key={type}
                  onPress={() => onChange({ eventType: type, note })}
                  style={[
                    styles.option,
                    { borderColor: EVENT_META[type].color },
                    isActive && { backgroundColor: EVENT_META[type].color },
                  ]}
                >
                  <Text style={[styles.optionText, isActive && styles.optionTextInverted]}>
                    {EVENT_META[type].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={note}
            onChangeText={(text) => onChange({ eventType, note: text })}
            placeholder="Add details to show on the trend chart"
            multiline
            textAlignVertical="top"
            style={styles.input}
          />
        </View>
      ) : null}
    </View>
  );
}

export function getEventColor(eventType: EventType | null) {
  if (!eventType) {
    return "#94a3b8";
  }

  return EVENT_META[eventType].color;
}

export function getEventLabel(eventType: EventType | null) {
  if (!eventType) {
    return "No event";
  }

  return EVENT_META[eventType].label;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d9e2ec",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#102a43",
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    color: "#52606d",
    fontSize: 12,
    marginTop: 2,
    maxWidth: 260,
  },
  chevron: {
    color: "#334e68",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    marginTop: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  optionActive: {
    backgroundColor: "#334e68",
    borderColor: "#334e68",
  },
  optionText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  optionTextActive: {
    color: "#ffffff",
  },
  optionTextInverted: {
    color: "#ffffff",
  },
  input: {
    marginTop: 12,
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9e2ec",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#102a43",
    fontSize: 14,
  },
});
