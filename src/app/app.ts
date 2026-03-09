import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ThemeService } from './services/theme.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
declare const gtag: Function;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly title = signal('dev-lingo');
  private readonly router = inject(Router);

  constructor(swUpdate: SwUpdate) {
    swUpdate.versionUpdates
    .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
    .subscribe(() => {
      location.reload();
    });
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (typeof gtag === 'function') {
        gtag('config', 'G-PC9R3WQCET', {
          'page_path': event.urlAfterRedirects
        });
      }
    });
  }
}
