import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameService } from '../../services/game.service';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterLink],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    protected readonly game = inject(GameService);
    protected readonly theme = inject(ThemeService);
    private readonly router = inject(Router);

    private readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    isLessonMode = computed(() => this.currentUrl().startsWith('/lesson'));

    showRefillModal = signal(false);

    formattedHeartTimer = computed(() => {
        // ... previous implementation ...
        const ms = this.game.nextHeartIn();
        if (ms <= 0) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    handleHeartRefill() {
        if (this.game.stats().hearts === 0) {
            this.showRefillModal.set(true);
        }
    }

    confirmRefill() {
        if (this.game.stats().gems >= 100) {
            if (this.game.removeGems(100)) {
                this.game.refillHearts();
                this.showRefillModal.set(false);
            }
        }
    }
}
