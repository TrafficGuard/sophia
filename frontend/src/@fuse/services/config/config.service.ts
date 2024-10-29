import { inject, Injectable } from '@angular/core';
import { FUSE_CONFIG } from '@fuse/services/config/config.constants';
import { merge } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from 'app/core/services/local-storage.service';

@Injectable({ providedIn: 'root' })
export class FuseConfigService {
    private _config: BehaviorSubject<any>;

    constructor(private _localStorageService: LocalStorageService) {
        const baseConfig = inject(FUSE_CONFIG);
        const storedScheme = this._localStorageService.getScheme();
        
        this._config = new BehaviorSubject(
            storedScheme 
                ? merge({}, baseConfig, { scheme: storedScheme })
                : baseConfig
        );
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for config
     */
    set config(value: any) {
        // Merge the new config over to the current config
        const config = merge({}, this._config.getValue(), value);

        // Execute the observable
        this._config.next(config);
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    get config$(): Observable<any> {
        return this._config.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resets the config to the default
     */
    reset(): void {
        // Set the config
        this._config.next(this.config);
    }
}