import {
    AsyncPipe,
    CurrencyPipe,
    NgClass,
    NgTemplateOutlet, SlicePipe, DecimalPipe
} from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormControl,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
    MatCheckboxChange,
    MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatOptionModule, MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AgentService } from 'app/modules/agents/services/agent.service';
import {
    AgentContext,
    AgentType,
    AgentPagination,
    AgentTag,
} from 'app/modules/agents/agent.types';
import {
    Observable,
    Subject,
    debounceTime,
    map,
    merge,
    switchMap,
    takeUntil,
} from 'rxjs';
import {SelectionModel} from "@angular/cdk/collections";
import {RouterModule} from "@angular/router";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
    selector: 'inventory-list',
    templateUrl: './agent-list.component.html',
    styleUrl: './agent-list.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        MatProgressBarModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTooltipModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatSortModule,
        MatPaginatorModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatOptionModule,
        MatCheckboxModule,
        MatRippleModule,
        AsyncPipe,
        DecimalPipe,
        RouterModule,
    ],
})
export class AgentListComponent
    implements OnInit, AfterViewInit, OnDestroy
{
    @ViewChild(MatPaginator) private _paginator: MatPaginator;
    @ViewChild(MatSort) private _sort: MatSort;

    agents$: Observable<AgentContext[]>;

    agentTypes: AgentType[];
    filteredTags: AgentTag[];
    flashMessage: 'success' | 'error' | null = null;
    isLoading = false;
    pagination: AgentPagination;
    searchInputControl: UntypedFormControl = new UntypedFormControl();
    tags: AgentTag[];
    tagsEditMode = false;

    selection = new SelectionModel<AgentContext>(true, []);

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _formBuilder: UntypedFormBuilder,
        private _inventoryService: AgentService
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Get the pagination
        this._inventoryService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: AgentPagination) => {
                // Update the pagination
                this.pagination = pagination;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the products
        this.agents$ = this._inventoryService.agents$;

        this._inventoryService.getAgents();

        this._inventoryService.agents$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((agents: AgentContext[]) => {
                // Update the vendors
                // this.a = vendors;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {
                    this.isLoading = true;
                    return this._inventoryService.getAgents();
                }),
                map(() => {
                    this.isLoading = false;
                })
            )
            .subscribe();
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {
        if (this._sort && this._paginator) {
            // Set the initial sort
            this._sort.sort({
                id: 'name',
                start: 'asc',
                disableClear: true,
            });

            // Mark for check
            this._changeDetectorRef.markForCheck();

            // If the user changes the sort order...
            this._sort.sortChange
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(() => {
                    // Reset back to the first page
                    this._paginator.pageIndex = 0;
                });

            // Get products if sort or page changes
            merge(this._sort.sortChange, this._paginator.page)
                .pipe(
                    switchMap(() => {
                        this.isLoading = true;
                        return this._inventoryService.getAgents( );
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                )
                .subscribe();
        }
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

    getStateClass(state: string): string {
        return `state-${state.toLowerCase()}`;
    }

    isAllSelected(): boolean {
        // const numSelected = this.selection.selected.length;
        // const numRows = this.agents.length;
        // return numSelected === numRows && numRows > 0;
        return false;
    }

    masterToggle(): void {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            // this.agents.forEach(row => this.selection.select(row));
        }
    }

    deleteSelectedAgents(): void {
        const selectedAgentIds = this.selection.selected.map(agent => agent.agentId);
        if (selectedAgentIds.length === 0) {
            // this._snackBar.open('No agents selected for deletion', 'Close', { duration: 3000 });
            return;
        }

        this._inventoryService.deleteAgents(selectedAgentIds).subscribe({
            next: () => {
                // this._snackBar.open('Agents deleted successfully', 'Close', { duration: 3000 });
                this.refreshAgents();
                this.selection.clear();
            },
            error: (error) => {
                console.error('Error deleting agents:', error);
                // this._snackBar.open('Error deleting agents', 'Close', { duration: 3000 });
            },
        });
    }

    refreshAgents(): void {
        this._inventoryService.getAgents().subscribe({
            next: () => {
                // this._snackBar.open('Agents refreshed', 'Close', { duration: 1000 });
            },
            error: (error) => {
                console.error('Error refreshing agents:', error);
                // this._snackBar.open('Error refreshing agents', 'Close', { duration: 3000 });
            },
        });
    }

    /**
     * Create product
     */
    createProduct(): void {
        console.log('TODO navigate')
    }
    // createProduct(): void {
    //     // Create the product
    //     this._inventoryService.createProduct().subscribe((newProduct) => {
    //         // Go to new product
    //         this.selectedProduct = newProduct;
    //
    //         // Fill the form
    //         this.selectedProductForm.patchValue(newProduct);
    //
    //         // Mark for check
    //         this._changeDetectorRef.markForCheck();
    //     });
    // }
    //

    /**
     * Delete the selected product using the form data
     */
    deleteSelectedProduct(): void {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete product',
            message:
                'Are you sure you want to remove this product? This action cannot be undone!',
            actions: {
                confirm: {
                    label: 'Delete',
                },
            },
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if (result === 'confirmed') {
                // Get the product object
                // const product = this.selectedProductForm.getRawValue();
                //
                // // Delete the product on the server
                // this._inventoryService
                //     .deleteProduct(product.id)
                //     .subscribe(() => {
                //         // Close the details
                //         this.closeDetails();
                //     });
            }
        });
    }

    /**
     * Show flash message
     */
    showFlashMessage(type: 'success' | 'error'): void {
        // Show the message
        this.flashMessage = type;

        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Hide it after 3 seconds
        setTimeout(() => {
            this.flashMessage = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        }, 3000);
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
