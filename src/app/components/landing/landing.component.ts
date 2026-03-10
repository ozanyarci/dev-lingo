import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService } from '../../services/game.service';

@Component({
    selector: 'app-landing',
    imports: [CommonModule, RouterLink],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent {
    protected readonly game = inject(GameService);

    getFormattedTotalTime(): string {
        const ms = this.game.totalTimeMs();
        if (!ms || ms <= 0) return '0 min';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }

        return `${minutes} min`;
    }
}
