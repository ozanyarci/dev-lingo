import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LearnComponent } from './components/learn/learn.component';
import { LessonComponent } from './components/lesson/lesson.component';
import { LearnTypescriptComponent } from './components/learn-typescript/learn-typescript';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'learn', component: LearnComponent },
    { path: 'learn/typescript', component: LearnTypescriptComponent },
    { path: 'lesson/:id', component: LessonComponent },
    { path: 'lesson/typescript/:typescriptid', component: LessonComponent },
    { path: '**', redirectTo: '' }
];
