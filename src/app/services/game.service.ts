import { Injectable, signal, computed, effect } from '@angular/core';

export interface UserStats {
    streak: number;
    gems: number;
    hearts: number;
    lastHeartUpdate: number;
    xp: number;
    level: number;
    completedLessons: number[];
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

    constructor() {
        // Automatically save to localStorage whenever stats change
        effect(() => {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats()));
        });

        // Periodic check for heart refill
        this.checkHearts();
        setInterval(() => this.checkHearts(), 1000); // Check every second for timer updates
    }

    private loadStats(): UserStats {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure lastHeartUpdate exists for legacy data
                if (!parsed.lastHeartUpdate) parsed.lastHeartUpdate = Date.now();
                return parsed;
            } catch (e) {
                console.error('Failed to load stats', e);
            }
        }
        return {
            streak: 0,
            gems: 500,
            hearts: 5,
            lastHeartUpdate: Date.now(),
            xp: 0,
            level: 1,
            completedLessons: []
        };
    }

    private checkHearts() {
        const now = Date.now();
        const s = this.stats();

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
            if (s.completedLessons.includes(lessonId)) return s;
            return { ...s, completedLessons: [...s.completedLessons, lessonId] };
        });
    }

    private checkLevelUp() {
        if (this.stats().xp >= this.pointsToNextLevel()) {
            this._stats.update(s => ({ ...s, level: s.level + 1, xp: 0 }));
        }
    }
}
