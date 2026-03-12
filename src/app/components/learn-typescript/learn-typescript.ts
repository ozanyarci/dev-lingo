import { Component, inject, computed, signal, AfterViewInit } from '@angular/core';
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
  selector: 'app-learn-typescript',
  imports: [CommonModule, RouterLink],
  templateUrl: './learn-typescript.html',
  styleUrl: './learn-typescript.css'
})
export class LearnTypescriptComponent implements AfterViewInit {
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
    { id: 1, title: 'Introduction to TypeScript', description: 'Introduction to TypeScript', color: '#c8a545ff', lessons: 5 },
    { id: 2, title: 'Everyday Types', description: 'Everyday Types', color: '#a82699ff', lessons: 7 },
    { id: 3, title: 'Narrowing', description: 'Narrowing', color: '#69cf02', lessons: 7 },
    { id: 4, title: 'More on Functions', description: 'More on Functions', color: '#9cc079ff', lessons: 9 },
    { id: 5, title: 'Object Types', description: 'Object Types', color: '#2b4cb9ff', lessons: 9 },
    { id: 6, title: 'Generics', description: 'Generics', color: '#c95dc7ff', lessons: 7 },
    { id: 7, title: 'Keyof Type Operator', description: 'Keyof Type Operato', color: '#5f9327ff', lessons: 1 },
    { id: 8, title: 'Typeof Type Operator', description: 'Typeof Type Operator', color: '#96a8d0ff', lessons: 1 },
    { id: 9, title: 'Indexed Access Types', description: 'Indexed Access Types', color: '#881a48ff', lessons: 1 },
    { id: 10, title: 'Conditional Types', description: 'Conditional Types', color: '#8075bdff', lessons: 3 },
    { id: 11, title: 'Mapped Types', description: 'Mapped Types', color: '#b39746ff', lessons: 5 },
    { id: 12, title: 'Template Literal Types', description: 'Template Literal Types', color: '#8d273dff', lessons: 5 },
    { id: 13, title: 'Classes in TypeScript', description: 'Classes in TypeScript', color: '#4024b1ff', lessons: 9 },
    { id: 14, title: 'Modules', description: 'Modules', color: '#2d9b82ff', lessons: 5 },
    
  ];

  ngOnInit() {
    this.lessonService.loadLessons('typescript');
  }

  ngAfterViewInit() {
    // Small timeout to ensure the DOM is ready and styles are applied
    setTimeout(() => {
      this.scrollToCurrentLesson();
    }, 100);
  }

  private scrollToCurrentLesson() {
    const currentLesson = document.getElementById('current-lesson-typescript');
    if (currentLesson) {
      currentLesson.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  getLessonsArray(count: number) {
    return Array(count).fill(0);
  }

  isLessonCompleted(unitId: number, lessonIndex: number): boolean {
    const lessonId = unitId * 100 + (lessonIndex + 1);
    return this.game.stats().completedLessonsForTypeScript?.includes(lessonId);
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
    const lessons = this.lessonService.getLessonsByUnitForTypescript(unit.id);
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
