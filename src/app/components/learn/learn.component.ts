import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService } from '../../services/game.service';
import { LessonService } from '../../services/lesson.service';

interface Unit {
    id: number;
    title: string;
    description: string;
    color: string;
    lessons: number;
}

interface GuidebookContent {
    unitTitle: string;
    color: string;
    sections: { title: string; explanations: string[] }[];
}

@Component({
    selector: 'app-learn',
    imports: [CommonModule, RouterLink],
    templateUrl: './learn.component.html',
    styleUrl: './learn.component.css'
})
export class LearnComponent {
    protected readonly game = inject(GameService);
    private readonly lessonService = inject(LessonService);

    showHeartsModal = signal(false);
    showGuidebookModal = signal(false);
    guidebookContent = signal<GuidebookContent | null>(null);

    outOfHearts = computed(() => this.game.stats().hearts === 0);

    formattedHeartTimer = computed(() => {
        const ms = this.game.nextHeartIn();
        if (ms <= 0) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    units: Unit[] = [
        { id: 1, title: 'Introduction to JavaScript', description: 'Variables, Types, and Operations', color: '#58cc02', lessons: 5 },
        { id: 2, title: 'Grammar and Types', description: 'Declarations and Scoping', color: '#1cb0f6', lessons: 5 },
        { id: 3, title: 'Control flow and error handling', description: 'Conditionals and Exceptions', color: '#ffc800', lessons: 5 },
        { id: 4, title: 'Loops and iteration', description: 'Repeating blocks of code', color: '#ff4b4b', lessons: 5 },
        { id: 5, title: 'Functions', description: 'Reusable code blocks', color: '#a855f7', lessons: 5 }
    ];

    getLessonsArray(count: number) {
        return Array(count).fill(0);
    }

    isLessonCompleted(unitId: number, lessonIndex: number): boolean {
        const lessonId = unitId * 100 + (lessonIndex + 1);
        return this.game.stats().completedLessons.includes(lessonId);
    }

    isCurrentLesson(unitId: number, lessonIndex: number): boolean {
        // ... previous implementation ...
        if (this.isLessonCompleted(unitId, lessonIndex)) return false;

        for (let i = 0; i < lessonIndex; i++) {
            if (!this.isLessonCompleted(unitId, i)) return false;
        }

        if (unitId === 1 && lessonIndex === 0) return true;

        if (lessonIndex === 0 && unitId > 1) {
            const prevUnit = this.units.find(u => u.id === unitId - 1);
            if (prevUnit) {
                for (let i = 0; i < prevUnit.lessons; i++) {
                    if (!this.isLessonCompleted(prevUnit.id, i)) return false;
                }
                return true;
            }
        }

        return lessonIndex > 0 && this.isLessonCompleted(unitId, lessonIndex - 1);
    }

    isLessonAccessible(unitId: number, lessonIndex: number): boolean {
        return this.isLessonCompleted(unitId, lessonIndex) || this.isCurrentLesson(unitId, lessonIndex);
    }

    handleLessonClick(unitId: number, lessonIndex: number, event: Event) {
        if (!this.isLessonAccessible(unitId, lessonIndex)) {
            event.preventDefault();
            return;
        }

        if (this.game.stats().hearts <= 0) {
            event.preventDefault();
            this.showHeartsModal.set(true);
        }
    }

    openGuidebook(unit: Unit) {
        const lessons = this.lessonService.getLessonsByUnit(unit.id);
        const sections = lessons.map(lesson => {
            const explanations = lesson.questions
                .filter(q => q.explanation)
                .map(q => q.explanation!);

            return {
                title: lesson.title.replace(/^\d+\.\s*/, ''),
                explanations: explanations
            };
        }).filter(section => section.explanations.length > 0);

        this.guidebookContent.set({
            unitTitle: unit.title,
            color: unit.color,
            sections: sections
        });
        this.showGuidebookModal.set(true);
    }
}
