import { Platform } from '@angular/cdk/platform';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FusePlatformService {
    private _platform = inject(Platform);

    osName = 'os-unknown';

    /**
     * Constructor
     */
    constructor() {
        // If the platform is not a browser, return immediately
        if (!this._platform.isBrowser) {
            return;
        }

        // Windows
        if (navigator.userAgent.includes('Win')) {
            this.osName = 'os-windows';
        }

        // Mac OS
        if (navigator.userAgent.includes('Mac')) {
            this.osName = 'os-mac';
        }

        // Unix
        if (navigator.userAgent.includes('X11')) {
            this.osName = 'os-unix';
        }

        // Linux
        if (navigator.userAgent.includes('Linux')) {
            this.osName = 'os-linux';
        }

        // iOS
        if (this._platform.IOS) {
            this.osName = 'os-ios';
        }

        // Android
        if (this._platform.ANDROID) {
            this.osName = 'os-android';
        }
    }
}
