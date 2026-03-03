import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LearnComponent } from './components/learn/learn.component';
import { LessonComponent } from './components/lesson/lesson.component';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'learn', component: LearnComponent },
    { path: 'lesson/:id', component: LessonComponent },
    { path: '**', redirectTo: '' }
];
