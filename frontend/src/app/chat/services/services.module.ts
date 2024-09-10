import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatBaseService } from './chat-base.service';
import { ServicesConfig } from './services-config';

/**
 * Help: https://angular.io/guide/singleton-services
 */

@NgModule({
  declarations: [],
  imports: [CommonModule],
})
export class ServicesModule {
  constructor(@Optional() @SkipSelf() parentModule?: ServicesModule) {
    if (parentModule) {
      throw new Error('GreetingModule is already loaded. Import it in the AppModule only');
    }
  }

  static forRoot(config: ServicesConfig): ModuleWithProviders {
    return {
      ngModule: ServicesModule,
      providers: [{ provide: ServicesConfig, useValue: config }],
    };
  }
}
