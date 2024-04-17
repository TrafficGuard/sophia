import { envVar } from '#utils/env-var';

export const projectId = envVar('VERTEX_PROJECT_ID');
export const region = envVar('VERTEX_REGION');
