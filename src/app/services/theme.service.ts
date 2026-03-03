import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly STORAGE_KEY = 'devlingo-theme';
    isDarkMode = signal<boolean>(false);

    constructor() {
        // Load initial theme
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme) {
            this.isDarkMode.set(savedTheme === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.isDarkMode.set(prefersDark);
        }

        // Apply theme effect
        effect(() => {
            const dark = this.isDarkMode();
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            localStorage.setItem(this.STORAGE_KEY, dark ? 'dark' : 'light');
        });
    }

    toggleTheme() {
        this.isDarkMode.update(dark => !dark);
    }
}
