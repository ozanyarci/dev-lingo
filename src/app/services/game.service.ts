import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { LessonService } from './lesson.service';
import { SupabaseService } from './supabase.service';

export interface UserStats {
    streak: number;
    lastLessonDate: string | null;
    gems: number;
    hearts: number;
    lastHeartUpdate: number;
    xp: number;           // XP towards current level
    level: number;
    completedLessons: number[];
    completedLessonsForTypeScript: number[];
    totalTimeMs: number;
    heartsUsed: number;
    totalXp: number;      // cumulative XP across all levels
}

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private readonly STORAGE_KEY = 'dev-lingo-stats';
    private readonly MAX_HEARTS = 5;
    private readonly REFILL_TIME = 60 * 60 * 1000; // 1 hour in ms

    private readonly _stats = signal<UserStats>(this.loadStats());

    readonly stats = this._stats.asReadonly();

    readonly pointsToNextLevel = computed(() => this.stats().level * 1000);
    readonly progressToNextLevel = computed(() => (this.stats().xp / this.pointsToNextLevel()) * 100);

    readonly totalJavascriptLessonsCompleted = computed(
        () => this.stats().completedLessons.length
    );
    readonly totalTypescriptLessonsCompleted = computed(
        () => this.stats().completedLessonsForTypeScript.length
    );
    readonly totalHeartsUsed = computed(() => this.stats().heartsUsed ?? 0);
    readonly totalTimeMs = computed(() => this.stats().totalTimeMs ?? 0);
    // Cumulative XP across all levels:
    // level 1: 0–999, level 2: 1000–2999, level 3: 3000–5999, etc.
    readonly totalXpGained = computed(() => {
        const { level, xp } = this.stats();
        const completedLevels = Math.max(0, level - 1);
        const perLevel = 1000;
        const completedXp = perLevel * (completedLevels * (completedLevels + 1)) / 2;
        return completedXp + xp;
    });

    // Time remaining until the next heart in milliseconds
    readonly nextHeartIn = signal<number>(0);

    lessonService = inject(LessonService);
    private readonly supabase = inject(SupabaseService);

    private lastActiveTimestamp = Date.now();
    private readonly isInitialCloudLoadComplete = signal(false);

    constructor() {
        // Automatically save to localStorage whenever stats change
        effect(() => {
            const snapshot = this.stats();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));

            // If logged in, also sync to Supabase
            // ONLY sync if we have successfully loaded (or tried to load) the cloud data
            const user = this.supabase.user();
            if (user && this.isInitialCloudLoadComplete()) {
                this.syncToSupabase(snapshot);
            }
        });

        // When a user logs in, try to load stats from Supabase once
        effect(() => {
            const user = this.supabase.user();
            if (!user) {
                this.isInitialCloudLoadComplete.set(false);
                return;
            }
            this.loadFromSupabase();
        });

        // Initial status check (no time accumulation yet)
        this.checkStatus(false);
        // Periodic check for hearts, streak, and time spent
        setInterval(() => this.checkStatus(true), 1000);
    }

    private normalizeStats(raw: UserStats): UserStats {
        const stats = { ...raw };
        if (!stats.lastHeartUpdate) stats.lastHeartUpdate = Date.now();
        if (stats.lastLessonDate === undefined) stats.lastLessonDate = null;
        if (stats.totalTimeMs === undefined) stats.totalTimeMs = 0;
        if (stats.heartsUsed === undefined) stats.heartsUsed = 0;
        if ((stats as any).totalXp === undefined) (stats as any).totalXp = stats.xp ?? 0;
        return this.checkStreakReset(stats);
    }

    private loadStats(): UserStats {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        let stats: UserStats;

        if (saved) {
            try {
                stats = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load stats', e);
                stats = this.getDefaultStats();
            }
        } else {
            stats = this.getDefaultStats();
        }

        return this.normalizeStats(stats);
    }

    private getDefaultStats(): UserStats {
        return {
            streak: 0,
            lastLessonDate: null,
            gems: 500,
            hearts: 5,
            lastHeartUpdate: Date.now(),
            xp: 0,
            level: 1,
            completedLessons: [],
            completedLessonsForTypeScript: [],
            totalTimeMs: 0,
            heartsUsed: 0,
            totalXp: 0
        };
    }

    private checkStreakReset(stats: UserStats): UserStats {
        if (!stats.lastLessonDate) return stats;

        const today = new Date().toISOString().split('T')[0];
        const lastDate = stats.lastLessonDate;

        if (today === lastDate) return stats;

        const last = new Date(lastDate);
        const now = new Date(today);
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            return { ...stats, streak: 0 };
        }

        return stats;
    }

    private async loadFromSupabase() {
        const client = this.supabase.getClient();
        const user = this.supabase.user();
        if (!client || !user) {
            this.isInitialCloudLoadComplete.set(true);
            return;
        }

        try {
            const { data, error } = await client
                .from('user_stats')
                .select('stats')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // PGRST116 = row not found; that's fine on first login
                if ((error as any).code !== 'PGRST116') {
                    console.error('Failed to load stats from Supabase', error);
                }
                return;
            }

            if (data?.stats) {
                const normalized = this.normalizeStats(data.stats as UserStats);
                this._stats.set(normalized);
            }
        } finally {
            this.isInitialCloudLoadComplete.set(true);
        }
    }

    // Public helper to refresh from cloud on demand
    async refreshFromCloud(): Promise<void> {
        await this.loadFromSupabase();
    }

    private async syncToSupabase(statsOverride?: UserStats) {
        const client = this.supabase.getClient();
        const user = this.supabase.user();
        if (!client || !user) return;

        const stats = statsOverride ?? this.stats();
        const { error } = await client
            .from('user_stats')
            .upsert(
                {
                    user_id: user.id,
                    stats
                },
                { onConflict: 'user_id' }
            );
        if (error) {
            console.error('Failed to sync stats to Supabase', error);
        }
    }

    private checkStatus(trackTime: boolean) {
        const now = Date.now();

        if (trackTime) {
            const delta = now - this.lastActiveTimestamp;
            if (delta > 0 && delta < 5 * 60 * 60 * 1000) { // cap to avoid huge jumps
                this._stats.update(s => ({
                    ...s,
                    totalTimeMs: (s.totalTimeMs ?? 0) + delta
                }));
            }
        }

        this.lastActiveTimestamp = now;

        const s = this.stats();

        // 1. Heart Refill
        if (s.hearts < this.MAX_HEARTS) {
            const timePassed = now - s.lastHeartUpdate;
            const heartsToGain = Math.floor(timePassed / this.REFILL_TIME);

            if (heartsToGain > 0) {
                const newHearts = Math.min(this.MAX_HEARTS, s.hearts + heartsToGain);
                this._stats.update(curr => ({
                    ...curr,
                    hearts: newHearts,
                    lastHeartUpdate: curr.lastHeartUpdate + (heartsToGain * this.REFILL_TIME)
                }));
            }

            // Update countdown for UI
            const remaining = this.REFILL_TIME - (timePassed % this.REFILL_TIME);
            this.nextHeartIn.set(remaining);
        } else {
            this.nextHeartIn.set(0);
        }

        // 2. Streak Reset (Midnight transition)
        const today = new Date().toISOString().split('T')[0];
        if (s.lastLessonDate && s.lastLessonDate !== today) {
            const last = new Date(s.lastLessonDate);
            const current = new Date(today);
            const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays > 1 && s.streak > 0) {
                this._stats.update(curr => ({ ...curr, streak: 0 }));
            }
        }
    }

    addXp(amount: number) {
        this._stats.update(s => ({
            ...s,
            xp: s.xp + amount,
            totalXp: (s.totalXp ?? 0) + amount
        }));
        this.checkLevelUp();
    }

    useHeart() {
        const s = this.stats();
        if (s.hearts <= 0) return;

        this._stats.update(curr => {
            const newHearts = curr.hearts - 1;
            // If we were at max, start the timer now
            const newLastUpdate = curr.hearts === this.MAX_HEARTS ? Date.now() : curr.lastHeartUpdate;
            return {
                ...curr,
                hearts: newHearts,
                lastHeartUpdate: newLastUpdate,
                heartsUsed: (curr.heartsUsed ?? 0) + 1
            };
        });
    }

    addGems(amount: number) {
        this._stats.update(s => ({ ...s, gems: s.gems + amount }));
    }

    removeGems(amount: number): boolean {
        const s = this.stats();
        if (s.gems < amount) return false;
        this._stats.update(curr => ({ ...curr, gems: curr.gems - amount }));
        return true;
    }

    refillHearts() {
        this._stats.update(s => ({
            ...s,
            hearts: this.MAX_HEARTS,
            lastHeartUpdate: Date.now()
        }));
    }

    completeLesson(lessonId: number) {
        this._stats.update(s => {

            const today = new Date().toISOString().split('T')[0];
            let newStreak = s.streak;

            if (s.lastLessonDate === null) {
                newStreak = 1;
            } else if (s.lastLessonDate !== today) {

                const last = new Date(s.lastLessonDate);
                const now = new Date(today);

                const diffDays = Math.floor(
                    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (diffDays === 1) {
                    newStreak = s.streak + 1;
                } else {
                    newStreak = 1;
                }
            }

            let newCompleted = s.completedLessons;
            let newCompletedForTypescript = s.completedLessonsForTypeScript;

            //remove 0 from completedLessonsForTypeScript
            const index = newCompletedForTypescript?.indexOf(0);
            if (index !== -1 && index != null) {
                newCompletedForTypescript.splice(index, 1);
            }

            if (this.lessonService.currentParamater() === 'javascript') {

                const alreadyCompleted = s.completedLessons?.includes(lessonId);

                if (!alreadyCompleted) {
                    newCompleted = [...(s.completedLessons ?? []), lessonId];
                }

            } else {

                const alreadyCompleted = s.completedLessonsForTypeScript?.includes(lessonId);

                if (!alreadyCompleted) {
                    newCompletedForTypescript = [...(s.completedLessonsForTypeScript ?? []), lessonId];
                }
            }

            return {
                ...s,
                streak: newStreak,
                lastLessonDate: today,
                completedLessons: newCompleted,
                completedLessonsForTypeScript: newCompletedForTypescript
            };

        });
    }

    private checkLevelUp() {
        if (this.stats().xp >= this.pointsToNextLevel()) {
            this._stats.update(s => ({ ...s, level: s.level + 1, xp: 0 }));
        }
    }
}
