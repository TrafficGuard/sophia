import { Injectable } from '@angular/core';
import { Scheme } from '@fuse/services/config/config.types';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
    private readonly SCHEME_KEY = 'app.ui.scheme';

    setScheme(scheme: Scheme): void {
        localStorage.setItem(this.SCHEME_KEY, scheme);
    }

    getScheme(): Scheme | null {
        return localStorage.getItem(this.SCHEME_KEY) as Scheme | null;
    }
}
