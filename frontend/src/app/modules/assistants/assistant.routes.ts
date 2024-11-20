import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { AssistantsComponent } from 'app/modules/assistants/assistants.component';
import { AssistantsService } from 'app/modules/assistants/assistants.service';
import { AssistantListComponent } from 'app/modules/assistants/chats/assistant-list.component';
import { AssistantComponent } from 'app/modules/assistants/assistant/assistant.component';
import { EmptyAssistantComponent } from 'app/modules/assistants/empty-assistant/empty-assistant.component';
import { catchError, throwError } from 'rxjs';

/**
 * Conversation resolver
 *
 * @param route
 * @param state
 */
const conversationResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const chatService = inject(AssistantsService);
    const router = inject(Router);

    return chatService.getChatById(route.paramMap.get('id')).pipe(
        // Error here means the requested chat is not available
        catchError((error) => {
            // Log the error
            console.error(error);

            // Get the parent url
            const parentUrl = state.url.split('/').slice(0, -1).join('/');

            // Navigate to there
            router.navigateByUrl(parentUrl).catch(console.error);

            // Throw an error
            return throwError(error);
        })
    );
};

export default [
    {
        path: '',
        component: AssistantsComponent,
        resolve: {
            chats: () => inject(AssistantsService).getChats(),
        },
        children: [
            {
                path: '',
                component: AssistantListComponent,
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        component: EmptyAssistantComponent,
                    },
                    {
                        path: 'new',
                        component: AssistantComponent,
                    },
                    {
                        path: ':id',
                        component: AssistantComponent,
                        resolve: {
                            conversation: conversationResolver,
                        },
                    },
                ],
            },
        ],
    },
] as Routes;
