/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'apps.chat',
        title: 'Chat',
        type: 'basic',
        icon: 'heroicons_outline:chat-bubble-bottom-center-text',
        link: '/apps/chat',
    },
    // {
    //     id: 'assistants',
    //     title: 'Assistants',
    //     type: 'basic',
    //     icon: 'mat_outline:support_agent',
    //     link: '/assistants',
    // },
    {
        id: 'agents',
        title: 'Agents',
        type: 'basic',
        icon: 'heroicons_outline:squares-2x2',
        link: '/agents/list',
    },
    {
        id: 'new-agent',
        title: 'New Agent',
        type: 'basic',
        icon: 'heroicons_outline:squares-plus',
        link: '/agents/new',
    },
    {
        id: 'actions',
        title: 'Actions',
        type: 'basic',
        icon: 'heroicons_outline:server-stack',
        link: '/actions',
    },
    {
        id: 'codereviews',
        title: 'Code reviews',
        type: 'basic',
        icon: 'heroicons_outline:code-bracket-square',
        link: '/code-reviews',
    }
];
export const compactNavigation: FuseNavigationItem[] = defaultNavigation;
export const futuristicNavigation: FuseNavigationItem[] = defaultNavigation;
export const horizontalNavigation: FuseNavigationItem[] = defaultNavigation;
