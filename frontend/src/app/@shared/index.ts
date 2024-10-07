export * from './shared.module';
export * from './http/api-prefix.interceptor';
export * from './http/error-handler.interceptor';
export * from './loader/loader.component';
export * from './route-reusable-strategy';
export * from './logger.service';
export * from '@ngneat/until-destroy';

export type Data<T> = {
  data: T;
};

export type AgentType = 'xml' | 'codegen';
