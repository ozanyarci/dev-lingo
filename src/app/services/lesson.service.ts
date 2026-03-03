import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Question {
    id: number;
    type: 'multiple-choice' | 'code-completion';
    text: string;
    code?: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
}

export interface Lesson {
    id: number;
    title: string;
    questions: Question[];
}

@Injectable({
    providedIn: 'root'
})
export class LessonService {
    private readonly http = inject(HttpClient);
    private lessons = signal<Lesson[]>([]);
    isLoaded = signal(false);

    constructor() {
        this.loadLessons();
    }

    private async loadLessons() {
        try {
            const response = await firstValueFrom(this.http.get<{ data: string }>('assets/data/lessons.json'));
            if (response && response.data) {
                // Decode Base64 to bytes, then bytes to string (UTF-8)
                const binaryString = atob(response.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decodedData = new TextDecoder().decode(bytes);

                this.lessons.set(JSON.parse(decodedData));
                this.isLoaded.set(true);
                console.log('Successfully loaded lessons data.');
            }
        } catch (error) {
            console.error('Failed to load lessons:', error);
        }
    }

    getLesson(id: number): Lesson | undefined {
        return this.lessons().find(l => l.id === id);
    }

    getLessonsByUnit(unitId: number): Lesson[] {
        const start = unitId * 100;
        const end = (unitId + 1) * 100;
        return this.lessons().filter(l => l.id > start && l.id < end);
    }

    getAllLessons(): Lesson[] {
        return this.lessons();
    }
}
