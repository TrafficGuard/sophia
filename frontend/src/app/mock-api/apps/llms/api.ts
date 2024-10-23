import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import {
    contacts as contactsData,
    countries as countriesData,
    tags as tagsData,
} from 'app/mock-api/apps/contacts/data';
import { assign, cloneDeep } from 'lodash-es';
import { from, map } from 'rxjs';
import {llms} from "./data";

@Injectable({ providedIn: 'root' })
export class ContactsMockApi {

    /**
     * Constructor
     */
    constructor(private _fuseMockApiService: FuseMockApiService) {
        this.registerHandlers();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {
        // -----------------------------------------------------------------------------------------------------
        // @ llms - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/llms').reply(() => {
            // Return the response
            return [200, cloneDeep(llms)];
        });
    }
}
