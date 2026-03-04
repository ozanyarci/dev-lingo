import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { LessonService, Question } from '../../services/lesson.service';

@Component({
    selector: 'app-lesson',
    imports: [CommonModule],
    templateUrl: './lesson.component.html',
    styleUrl: './lesson.component.css'
})
export class LessonComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly game = inject(GameService);
    private readonly lessonService = inject(LessonService);

    lessonId = signal<number>(0);
    currentQuestionIndex = signal<number>(0);
    selectedOption = signal<string | null>(null);
    isAnswerChecked = signal<boolean>(false);
    isCorrect = signal<boolean>(false);
    questions = signal<Question[]>([]);
    lessonTitle = signal<string>('');
    isSummaryShown = signal<boolean>(false);
    timeSpent = signal<string>('');
    totalCompletionPercentage = signal<number>(0);
    xpEarned = signal<number>(0);
    private startTime: number = 0;
    outOfHearts = computed(() => this.game.stats().hearts === 0);

    formattedHeartTimer = computed(() => {
        const ms = this.game.nextHeartIn();
        if (ms <= 0) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    constructor() {
        effect(() => {
            const id = this.lessonId();
            if (id > 0 && this.lessonService.isLoaded()) {
                const lesson = this.lessonService.getLesson(id);
                if (lesson) {
                    this.questions.set(lesson.questions);
                    this.lessonTitle.set(lesson.title);
                } else {
                    this.router.navigate(['/learn']);
                }
            }
        });
    }

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.lessonId.set(id);
        this.startTime = Date.now();
    }

    selectOption(option: string) {
        if (this.isAnswerChecked()) return;
        this.selectedOption.set(option);
    }

    checkAnswer() {
        if (this.isAnswerChecked()) {
            this.nextQuestion();
            return;
        }

        if (!this.selectedOption()) return;

        this.isAnswerChecked.set(true);
        const correct = this.selectedOption() === this.questions()[this.currentQuestionIndex()].correctAnswer;
        this.isCorrect.set(correct);

        if (correct) {
            this.game.addXp(20);
            this.xpEarned.update(xp => xp + 20);
        } else {
            this.game.useHeart();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex() < this.questions().length - 1) {
            this.currentQuestionIndex.update(i => i + 1);
            this.selectedOption.set(null);
            this.isAnswerChecked.set(false);
        } else {
            // Lesson complete
            const endTime = Date.now();
            const diff = endTime - this.startTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            this.timeSpent.set(`${minutes}:${seconds.toString().padStart(2, '0')}`);

            this.game.addGems(50);
            this.game.completeLesson(this.lessonId());

            // Calculate total progress
            const totalLessons = this.lessonService.getAllLessons().length;
            const completedCount = this.game.stats().completedLessons.length;
            this.totalCompletionPercentage.set(Math.round((completedCount / totalLessons) * 100));

            this.isSummaryShown.set(true);
        }
    }

    exitLesson() {
        if (this.isSummaryShown() || confirm('Are you sure you want to quit? You will lose your progress.')) {
            this.router.navigate(['/learn']);
        }
    }

    get progress() {
        return this.questions().length > 0
            ? ((this.currentQuestionIndex() + (this.isAnswerChecked() ? 1 : 0)) / this.questions().length) * 100
            : 0;
    }
}
