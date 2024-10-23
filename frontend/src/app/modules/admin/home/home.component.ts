import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector     : 'example',
    standalone   : true,
    templateUrl  : './home.component.html',
    encapsulation: ViewEncapsulation.None,
})
export class HomeComponent
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}
