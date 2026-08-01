"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AchievementDefinition } from "../achievements";

const UNLOCK_ANNOUNCEMENT_DELAY_MS = 450;

type AchievementAnnouncement = {
  achievement: AchievementDefinition;
  userId: string;
};

export function useAccountAchievements(userId: string | null) {
  const [announcements, setAnnouncements] =
    useState<AchievementAnnouncement[]>([]);
  const announcementTimeoutsRef = useRef<number[]>([]);
  const activeUserIdRef = useRef(userId);
  activeUserIdRef.current = userId;

  const clearAnnouncementTimeouts = useCallback(() => {
    announcementTimeoutsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    announcementTimeoutsRef.current = [];
  }, []);

  const clearAnnouncements = useCallback(() => {
    clearAnnouncementTimeouts();
    setAnnouncements([]);
  }, [clearAnnouncementTimeouts]);

  const announceVerifiedUnlocks = useCallback(
    (achievements: AchievementDefinition[]) => {
      if (!userId) {
        return;
      }

      const announcementUserId = userId;
      achievements.forEach((achievement, index) => {
        const timeoutId = window.setTimeout(() => {
          if (activeUserIdRef.current === announcementUserId) {
            setAnnouncements((current) => [
              ...current,
              { achievement, userId: announcementUserId },
            ]);
          }
        }, UNLOCK_ANNOUNCEMENT_DELAY_MS + index * 180);
        announcementTimeoutsRef.current.push(timeoutId);
      });
    },
    [userId],
  );

  const dismissAnnouncement = useCallback(() => {
    setAnnouncements((current) => current.slice(1));
  }, []);

  useEffect(() => {
    clearAnnouncements();
  }, [clearAnnouncements, userId]);

  useEffect(() => clearAnnouncementTimeouts, [clearAnnouncementTimeouts]);

  const currentAnnouncement = announcements[0];

  return {
    announceVerifiedUnlocks,
    currentAnnouncement:
      currentAnnouncement?.userId === userId
        ? currentAnnouncement.achievement
        : null,
    dismissAnnouncement,
  };
}
