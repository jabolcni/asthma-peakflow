import Constants from "expo-constants";
import { Platform } from "react-native";

import type { ReminderSlot } from "../db/schema";

const CHANNEL_ID = "peak-flow-reminders";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let handlerConfigured = false;

function parseReminderTime(value: string) {
  const [hoursText, minutesText] = value.split(":");

  return {
    hour: Number(hoursText ?? "8"),
    minute: Number(minutesText ?? "0"),
  };
}

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function getNotificationsModule() {
  if (isExpoGo()) {
    throw new Error("Reminders are unavailable in Expo Go. Use a development build for notifications.");
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }

  const Notifications = await notificationsModulePromise;

  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    handlerConfigured = true;
  }

  return Notifications;
}

async function ensureNotificationsReady() {
  const Notifications = await getNotificationsModule();
  const permissions = await Notifications.requestPermissionsAsync();

  if (!permissions.granted) {
    throw new Error("Notification permission was not granted.");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Peak flow reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: "#1f6f4a",
    });
  }

  return Notifications;
}

export async function scheduleReminder(slot: ReminderSlot, time: string) {
  const Notifications = await ensureNotificationsReady();
  const { hour, minute } = parseReminderTime(time);
  const label = slot === "morning" ? "Morning" : "Evening";

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${label} peak flow reminder`,
      body: "Record your peak flow reading and how you feel.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelReminder(identifier: string | null) {
  if (!identifier) {
    return;
  }

  const Notifications = await getNotificationsModule();
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
