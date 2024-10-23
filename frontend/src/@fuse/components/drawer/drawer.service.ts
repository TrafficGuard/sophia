import { Injectable } from '@angular/core';
import { FuseDrawerComponent } from '@fuse/components/drawer/drawer.component';

@Injectable({ providedIn: 'root' })
export class FuseDrawerService {
    private _componentRegistry: Map<string, FuseDrawerComponent> = new Map<
        string,
        FuseDrawerComponent
    >();

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register drawer component
     *
     * @param name
     * @param component
     */
    registerComponent(name: string, component: FuseDrawerComponent): void {
        this._componentRegistry.set(name, component);
    }

    /**
     * Deregister drawer component
     *
     * @param name
     */
    deregisterComponent(name: string): void {
        this._componentRegistry.delete(name);
    }

    /**
     * Get drawer component from the registry
     *
     * @param name
     */
    getComponent(name: string): FuseDrawerComponent | undefined {
        return this._componentRegistry.get(name);
    }
}
