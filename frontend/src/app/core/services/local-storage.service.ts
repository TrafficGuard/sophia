import { Injectable } from '@angular/core';
import { Scheme } from '@fuse/services/config/config.types';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
    private readonly SCHEME_KEY = 'app.ui.scheme';
    private readonly LAYOUT_KEY = 'app.ui.layout';

    setScheme(scheme: Scheme): void {
        localStorage.setItem(this.SCHEME_KEY, scheme);
    }

    getScheme(): Scheme | null {
        return localStorage.getItem(this.SCHEME_KEY) as Scheme | null;
    }

    setLayout(layout: string): void {
        localStorage.setItem(this.LAYOUT_KEY, layout);
    }

    getLayout(): string | null {
        return localStorage.getItem(this.LAYOUT_KEY);
    }
}
