import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { LessonService } from './lesson.service';

export interface UserStats {
    streak: number;
    lastLessonDate: string | null;
    gems: number;
    hearts: number;
    lastHeartUpdate: number;
    xp: number;
    level: number;
    completedLessons: number[];
    completedLessonsForTypeScript: number[];
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

    // Time remaining until the next heart in milliseconds
    readonly nextHeartIn = signal<number>(0);

    lessonService = inject(LessonService);

    constructor() {
        // Automatically save to localStorage whenever stats change
        effect(() => {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats()));
        });

        // Periodic check for hearts and streak
        this.checkStatus();
        setInterval(() => this.checkStatus(), 1000);
    }

    private loadStats(): UserStats {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        let stats: UserStats;

        if (saved) {
            try {
                stats = JSON.parse(saved);
                // Ensure lastHeartUpdate exists for legacy data
                if (!stats.lastHeartUpdate) stats.lastHeartUpdate = Date.now();
                if (stats.lastLessonDate === undefined) stats.lastLessonDate = null;
            } catch (e) {
                console.error('Failed to load stats', e);
                stats = this.getDefaultStats();
            }
        } else {
            stats = this.getDefaultStats();
        }

        // Check for streak reset
        return this.checkStreakReset(stats);
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
            completedLessonsForTypeScript: []
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

    private checkStatus() {
        const now = Date.now();
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
        this._stats.update(s => ({ ...s, xp: s.xp + amount }));
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
                lastHeartUpdate: newLastUpdate
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
