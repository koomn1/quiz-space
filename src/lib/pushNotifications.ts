/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { playNotificationSound } from './sound';

export type PushNotificationPayload = {
  id: string;
  title: string;
  body: string;
  quizId?: string;
  quizName?: string;
  gameScore?: number;
  playerName?: string;
  timestamp?: Date;
  icon?: string;
};

type NotificationCallback = (payload: PushNotificationPayload) => void;

class PushNotificationManager {
  private listeners: Map<string, NotificationCallback> = new Map();
  private notificationPermission: 'default' | 'granted' | 'denied' = 'default';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.notificationPermission = (window.Notification?.permission) || 'default';
      } catch (e) {
        console.warn("Notification API not supported on this platform.", e);
      }
    }
  }

  // Request browser Notification API permissions
  public async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (typeof window === 'undefined' || !window.Notification) {
      return 'default';
    }

    try {
      const result = await window.Notification.requestPermission();
      this.notificationPermission = result;
      return result;
    } catch (e) {
      console.error("Error requesting permission", e);
      return 'default';
    }
  }

  public getPermissionStatus() {
    return this.notificationPermission;
  }

  // Register in-app listeners to display beautiful toaster cards
  public subscribe(id: string, callback: NotificationCallback) {
    this.listeners.set(id, callback);
  }

  public unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  // Primary entrypoint to dispatch a notification when someone breaks a record
  public dispatchRecordBroken(
    quizId: string,
    quizName: string,
    playerName: string,
    newHighScore: number,
    body: string
  ) {
    const payload: PushNotificationPayload = {
      id: 'push-' + Math.random().toString(36).substring(2, 9),
      title: '🏆 كسر الرقم القياسي! / Record Broken!',
      body: body,
      quizId,
      quizName,
      gameScore: newHighScore,
      playerName,
      timestamp: new Date()
    };

    // 1. Play premium high-score audio chime
    try {
      playNotificationSound('success');
    } catch (e) {
      console.warn("Chime failed to play", e);
    }

    // 2. Trigger native OS web push notification if granted
    if (typeof window !== 'undefined' && window.Notification && this.notificationPermission === 'granted') {
      try {
        const option = {
          body: payload.body,
          icon: '/favicon.ico',
          tag: 'record-broken-' + quizId,
          renotify: true
        };
        new window.Notification(payload.title, option);
      } catch (e) {
        console.warn("Native Notification trigger failed inside sandbox iframe: ", e);
      }
    }

    // 3. Notify all reactive components in the React lifecycle to slide down a magnificent card
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (e) {
        console.error("Error triggering notification listener callback", e);
      }
    });
  }

  // Generic trigger method for real-time app events
  public trigger(payload: Partial<PushNotificationPayload> & { title: string, body: string }) {
    const fullPayload: PushNotificationPayload = {
      id: payload.id || 'push-' + Math.random().toString(36).substring(2, 9),
      title: payload.title,
      body: payload.body,
      quizId: payload.quizId || '',
      quizName: payload.quizName || '',
      gameScore: payload.gameScore || 0,
      playerName: payload.playerName || '',
      timestamp: payload.timestamp || new Date()
    };

    if (typeof window !== 'undefined' && window.Notification && this.notificationPermission === 'granted') {
      try {
        const option = {
          body: fullPayload.body,
          icon: '/favicon.ico',
          tag: 'general-' + fullPayload.id,
          renotify: true
        };
        new window.Notification(fullPayload.title, option);
      } catch (e) {
        console.warn("Native Notification trigger failed inside sandbox iframe: ", e);
      }
    }

    this.listeners.forEach((callback) => {
      try {
        callback(fullPayload);
      } catch (e) {
        console.error("Error triggering notification callback", e);
      }
    });
  }
}

export const pushNotificationsManager = new PushNotificationManager();
