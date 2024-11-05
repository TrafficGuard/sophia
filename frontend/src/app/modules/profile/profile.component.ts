import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';
import { SettingsAccountComponent } from './account/account.component';
import { UiSettingsComponent } from './ui-settings/ui-settings.component';

@Component({
    selector: 'settings',
    templateUrl: './profile.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatSidenavModule,
        MatButtonModule,
        MatIconModule,
        NgClass,
        SettingsAccountComponent,
        UiSettingsComponent,
    ],
})
export class ProfileComponent implements OnInit, OnDestroy {
    @ViewChild('drawer') drawer: MatDrawer;
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened = true;
    panels: any[] = [];
    selectedPanel = 'account';
    private _unsubscribeAll: Subject<any> = new Subject();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService
    ) {
    }

    /**
     * Get panel from URL hash
     * @private
     */
    private getPanelFromHash(): string {
        const hash = window.location.hash.slice(1);
        return this.panels.find(panel => panel.id === hash)?.id || 'account';
    }

    /**
     * Update URL hash
     * @private
     */
    private updateUrlHash(panel: string): void {
        window.location.hash = panel === 'account' ? '' : panel;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Setup available panels
        this.panels = [
            {
                id: 'account',
                icon: 'heroicons_outline:user-circle',
                title: 'Account',
                description:
                    'Manage your profile and LLM API keys',
            },
            // {
            //     id: 'security',
            //     icon: 'heroicons_outline:lock-closed',
            //     title: 'Security',
            //     description:
            //         'Manage your password and 2-step verification preferences',
            // },
            // {
            //     id: 'plan-billing',
            //     icon: 'heroicons_outline:credit-card',
            //     title: 'Plan & Billing',
            //     description:
            //         'Manage your subscription plan, payment method and billing information',
            // },
            // {
            //     id: 'notifications',
            //     icon: 'heroicons_outline:bell',
            //     title: 'Notifications',
            //     description: "Manage when you'll be notified on which channels",
            // },
            {
                id: 'ui',
                icon: 'heroicons_outline:user-group',
                title: 'UI',
                description:
                    'Theme, layout and scheme settings',
            },
        ];

        // Set initial panel from URL hash
        this.selectedPanel = this.getPanelFromHash();

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {
                // Set the drawerMode and drawerOpened
                if (matchingAliases.includes('lg')) {
                    this.drawerMode = 'side';
                    this.drawerOpened = true;
                } else {
                    this.drawerMode = 'over';
                    this.drawerOpened = false;
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Navigate to the panel
     *
     * @param panel
     */
    goToPanel(panel: string): void {
        this.selectedPanel = panel;
        this.updateUrlHash(panel);

        // Close the drawer on 'over' mode
        if (this.drawerMode === 'over') {
            this.drawer.close();
        }
    }

    /**
     * Get the details of the panel
     *
     * @param id
     */
    getPanelInfo(id: string): any {
        return this.panels.find((panel) => panel.id === id);
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
}
