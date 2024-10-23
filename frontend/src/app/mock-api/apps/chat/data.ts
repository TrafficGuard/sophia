/* eslint-disable */
import { DateTime } from 'luxon';

/* Get the current instant */
const now = DateTime.now();

/**
 * Attachments are common and will be filled from here
 * to keep the demo data maintainable.
 */
const _attachments = {
    media: [
        'images/cards/01-320x200.jpg',
        'images/cards/02-320x200.jpg',
        'images/cards/03-320x200.jpg',
        'images/cards/04-320x200.jpg',
        'images/cards/05-320x200.jpg',
        'images/cards/06-320x200.jpg',
        'images/cards/07-320x200.jpg',
        'images/cards/08-320x200.jpg',
    ],
    docs: [],
    links: [],
};

/**
 *  If a message belongs to our user, it's marked by setting it as
 *  'me'. If it belongs to the user we are chatting with, then it
 *  left empty. We will be using this same conversation for each chat
 *  to keep things more maintainable for the demo.
 */
export const messages = [
    {
        id: 'e6b2b82f-b199-4a60-9696-5f3e40d2715d',
        chatId: '',
        contactId: 'me',
        value: 'Hi!',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 18,
                minute: 56,
            })
            .toISO(),
    },
    {
        id: 'eb82cf4b-fa93-4bf4-a88a-99e987ddb7ea',
        chatId: '',
        contactId: '',
        value: 'Hey, dude!',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 4,
            })
            .toISO(),
    },
    {
        id: '3cf9b2a6-ae54-47db-97b2-ee139a8f84e5',
        chatId: '',
        contactId: '',
        value: 'Long time no see.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 4,
            })
            .toISO(),
    },
    {
        id: '2ab91b0f-fafb-45f3-88df-7efaff29134b',
        chatId: '',
        contactId: 'me',
        value: 'Yeah, man... Things were quite busy for me and my family.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 6,
            })
            .toISO(),
    },
    {
        id: '10e81481-378f-49ac-b06b-7c59dcc639ae',
        chatId: '',
        contactId: '',
        value: "What's up? Anything I can help with?",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 6,
            })
            .toISO(),
    },
    {
        id: '3b334e72-6605-4ebd-a4f6-3850067048de',
        chatId: '',
        contactId: 'me',
        value: "We've been on the move, changed 3 places over 4 months",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 7,
            })
            .toISO(),
    },
    {
        id: '25998113-3a96-4dd0-a7b9-4d2bb58db3f3',
        chatId: '',
        contactId: '',
        value: "Wow! That's crazy! 🤯 What happened?",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 7,
            })
            .toISO(),
    },
    {
        id: '30adb3da-0e4f-487e-aec2-6d9f31e097f6',
        chatId: '',
        contactId: 'me',
        value: 'You know I got a job in that big software company. First move was because of that.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 8,
            })
            .toISO(),
    },
    {
        id: 'c0d6fd6e-d294-4845-8751-e84b8f2c4d3b',
        chatId: '',
        contactId: 'me',
        value: 'Then they decided to re-locate me after a month',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 8,
            })
            .toISO(),
    },
    {
        id: '8d3c442b-62fa-496f-bffa-210ff5c1866b',
        chatId: '',
        contactId: 'me',
        value: 'Which was an absolute pain because we just set up everything, house, kids school and all that.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 8,
            })
            .toISO(),
    },
    {
        id: '3cf26ef0-e81f-4698-ac39-487454413332',
        chatId: '',
        contactId: 'me',
        value: 'So we moved the second time.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 9,
            })
            .toISO(),
    },
    {
        id: '415151b9-9ee9-40a4-a4ad-2d88146bc71b',
        chatId: '',
        contactId: '',
        value: "It's crazy!",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 9,
            })
            .toISO(),
    },
    {
        id: 'd6f29648-c85c-4dfb-a6ff-6b7ebc40c993',
        chatId: '',
        contactId: 'me',
        value: 'Then this virus thing happened and just after a week we moved in, they decided the whole department will be working remotely.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 10,
            })
            .toISO(),
    },
    {
        id: '5329c20d-6754-47ec-af8c-660c72be3528',
        chatId: '',
        contactId: 'me',
        value: "And then we decided to move back our first location because, you know, everything was already setup so that's the third time.",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 10,
            })
            .toISO(),
    },
    {
        id: '26f2ccbf-aef7-4b49-88df-f6b59381110a',
        chatId: '',
        contactId: '',
        value: "Ohh dude, I'm really sorry you had to go through all that in such a short period of time",
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 11,
            })
            .toISO(),
    },
    {
        id: 'ea7662d5-7b72-4c19-ad6c-f80320541001',
        chatId: '',
        contactId: '',
        value: '😕',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 11,
            })
            .toISO(),
    },
    {
        id: '3a2d3a0e-839b-46e7-86ae-ca0826ecda7c',
        chatId: '',
        contactId: 'me',
        value: 'Thanks, man! It was good catching up with you.',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 11,
            })
            .toISO(),
    },
    {
        id: '562e3524-15b7-464a-bbf6-9b2582e5e0ee',
        chatId: '',
        contactId: '',
        value: 'Yeah dude. Hit me again next week so we can grab a coffee, remotely!',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 12,
            })
            .toISO(),
    },
    {
        id: '9269c775-bad5-46e1-b33b-2de8704ec1d6',
        chatId: '',
        contactId: 'me',
        value: ':) Sure, man! See you next week!',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 12,
            })
            .toISO(),
    },
    {
        id: '779a27f2-bece-41c6-b9ca-c422570aee68',
        chatId: '',
        contactId: '',
        value: 'See you later!',
        createdAt: now
            .minus({ week: 1 })
            .set({
                hour: 19,
                minute: 12,
            })
            .toISO(),
    },
    {
        id: 'bab8ca0e-b8e5-4375-807b-1c91fca25a5d',
        chatId: '',
        contactId: 'me',
        value: 'Hey! Are you available right now? How about if we grab that coffee today? Remotely, of course :)',
        createdAt: now
            .set({
                hour: 12,
                minute: 45,
            })
            .toISO(),
    },
    {
        id: '8445a84d-599d-4e2d-a31c-5f4f29ad2b4c',
        chatId: '',
        contactId: '',
        value: 'Hi!',
        createdAt: now
            .set({
                hour: 12,
                minute: 56,
            })
            .toISO(),
    },
    {
        id: '9f506742-50da-4350-af9d-61e53392fa08',
        chatId: '',
        contactId: '',
        value: "Sure thing! I'm gonna call you in 5, is it okay?",
        createdAt: now
            .set({
                hour: 12,
                minute: 56,
            })
            .toISO(),
    },
    {
        id: 'ca8523d8-faed-45f7-af09-f6bd5c3f3875',
        chatId: '',
        contactId: 'me',
        value: 'Awesome! Call me in 5 minutes..',
        createdAt: now
            .set({
                hour: 12,
                minute: 58,
            })
            .toISO(),
    },
    {
        id: '39944b00-1ffe-4ffb-8ca6-13c292812e06',
        chatId: '',
        contactId: '',
        value: '👍🏻',
        createdAt: now
            .set({
                hour: 13,
                minute: 0,
            })
            .toISO(),
    },
];
export const chats = [
    {
        id: 'ff6bc7f1-449a-4419-af62-b89ce6cae0aa',
        contactId: '9d3f0e7f-dcbd-4e56-a5e8-87b8154e9edf',
        unreadCount: 2,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '4459a3f0-b65e-4df2-8c37-6ec72fcc4b31',
        contactId: '16b9e696-ea95-4dd8-86c4-3caf705a1dc6',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'f73a5a34-a723-4b35-8439-5289e0164c83',
        contactId: 'bf172879-423a-4fd6-8df3-6d1938bbfe1f',
        unreadCount: 1,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '747f101c-0371-4ca3-9f20-cb913a80fe89',
        contactId: 'abd9e78b-9e96-428f-b3ff-4d934c401bee',
        unreadCount: 0,
        muted: true,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'b3facfc4-dfc2-4ac2-b55d-cb70b3e68419',
        contactId: '6519600a-5eaa-45f8-8bed-c46fddb3b26a',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'e3127982-9e53-4611-ac27-eb70c84be4aa',
        contactId: 'b62359fd-f2a8-46e6-904e-31052d1cd675',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'a30351f3-bfa6-4ce3-b13a-82748fe0edee',
        contactId: '2c37ed00-427a-46d7-8f8f-d711c768d1ee',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '5636c0ba-fa47-42ca-9160-27340583041e',
        contactId: 'b8258ccf-48b5-46a2-9c95-e0bd7580c645',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'feddd91a-51af-48d8-99b0-cd99ee060a36',
        contactId: 'e2946946-b4b5-4fd7-bab4-62c38cdff2f1',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '89421c2f-1751-4040-b09b-4a4268db47b9',
        contactId: '12148fa2-e0a4-49fb-b3c5-daeecdb5180a',
        unreadCount: 0,
        muted: true,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'ffbbfdb4-0485-44aa-8521-5ce1eda3fd2f',
        contactId: '81fdc48c-5572-4123-8a73-71b7892120de',
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: 'a477baea-df90-4e2f-b108-7791bcd50bc8',
        contactId: 'a9a9f382-e4c3-42fb-9fe9-65aa534732b5',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '450840c8-aa0b-47a4-b6ca-b864ad9a3a88',
        contactId: '7e8e1f1e-d19f-45c7-86bd-6fef599dae71',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '427270f0-841c-47f9-912c-3fd8139db5e6',
        contactId: '8141dd08-3a6e-4770-912c-59d0ed06dde6',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
    {
        id: '491b2918-e71e-4017-919e-0ba009afd003',
        contactId: '114642a2-ccb7-4cb1-ad2b-5e9b6a0c1d2e',
        unreadCount: 0,
        muted: false,
        lastMessage: 'See you tomorrow!',
        lastMessageAt: '26/04/2021',
    },
];
export const contacts = [
    {
        id: 'cd5fa417-b667-482d-b208-798d9da3213c',
        avatar: 'images/avatars/male-01.jpg',
        name: 'Dejesus Michael',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'dejesusmichael@mail.org',
                    label: 'Personal',
                },
                {
                    email: 'michael.dejesus@vitricomp.io',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bs',
                    phoneNumber: '984 531 2468',
                    label: 'Mobile',
                },
                {
                    country: 'bs',
                    phoneNumber: '806 470 2693',
                    label: 'Work',
                },
            ],
            title: 'Track Service Worker',
            company: 'Vitricomp',
            birthday: '1975-01-10T12:00:00.000Z',
            address: '279 Independence Avenue, Calvary, Guam, PO4127',
        },
        attachments: _attachments,
    },
    {
        id: 'beec5287-ed50-4504-858a-5dc3f8ce6935',
        avatar: null,
        name: 'Dena Molina',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'denamolina@mail.us',
                    label: 'Personal',
                },
                {
                    email: 'molina.dena@envire.tv',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'io',
                    phoneNumber: '934 537 3180',
                    label: 'Mobile',
                },
            ],
            title: 'Weather Analyst',
            company: 'Envire',
            birthday: '1994-12-05T12:00:00.000Z',
            address: '856 Woodside Avenue, Alfarata, Iowa, PO4992',
        },
        attachments: _attachments,
    },
    {
        id: '9d3f0e7f-dcbd-4e56-a5e8-87b8154e9edf',
        avatar: 'images/avatars/male-02.jpg',
        name: 'Bernard Langley',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'bernardlangley@mail.com',
                    label: 'Personal',
                },
                {
                    email: 'langley.bernard@boilcat.name',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'md',
                    phoneNumber: '893 548 2862',
                    label: 'Mobile',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Boilcat',
            birthday: '1988-05-26T12:00:00.000Z',
            address: '943 Adler Place, Hamilton, South Dakota, PO5592',
        },
        attachments: _attachments,
    },
    {
        id: '42a5da95-5e6d-42fd-a09d-de755d123a47',
        background: 'images/cards/16-640x480.jpg',
        name: 'Mclaughlin Steele',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'mclaughlinsteele@mail.me',
                    label: 'Personal',
                },
                {
                    email: 'steele.mclaughlin@accel.info',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'va',
                    phoneNumber: '830 484 3813',
                    label: 'Mobile',
                },
                {
                    country: 'va',
                    phoneNumber: '999 475 2789',
                    label: 'Work',
                },
                {
                    country: 'va',
                    phoneNumber: '933 406 3598',
                    label: 'Home',
                },
            ],
            company: 'Accel',
            birthday: '1968-08-13T12:00:00.000Z',
            address: '334 Sandford Street, Savage, Virgin Islands, PO1858',
        },
        attachments: _attachments,
    },
    {
        id: 'a7806ced-03f1-4197-8b30-00bdd463366b',
        avatar: 'images/avatars/male-04.jpg',
        name: 'Marsh Cochran',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'marshcochran@mail.biz',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tz',
                    phoneNumber: '864 401 3980',
                    label: 'Mobile',
                },
                {
                    country: 'tz',
                    phoneNumber: '956 546 2589',
                    label: 'Work',
                },
            ],
            title: 'Fundraising Director',
            company: 'Xsports',
            birthday: '1983-12-22T12:00:00.000Z',
            address: '487 Hamilton Walk, Bergoo, American Samoa, PO5616',
        },
        attachments: _attachments,
    },
    {
        id: 'f4ad15d9-5a24-463a-88ea-6189d6bb3a53',
        avatar: 'images/avatars/male-05.jpg',
        name: 'Parrish Austin',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'parrishaustin@mail.co.uk',
                    label: 'Personal',
                },
                {
                    email: 'austin.parrish@insource.net',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'lv',
                    phoneNumber: '834 426 3574',
                    label: 'Mobile',
                },
                {
                    country: 'lv',
                    phoneNumber: '816 573 3694',
                    label: 'Work',
                },
                {
                    country: 'lv',
                    phoneNumber: '967 515 2009',
                    label: 'Home',
                },
            ],
            title: 'Motor Winder',
            company: 'Insource',
            birthday: '1963-08-24T12:00:00.000Z',
            address: '610 Harbor Lane, Cascades, Minnesota, PO8639',
        },
        attachments: _attachments,
    },
    {
        id: '780d0111-5e5c-4694-8d1d-0ea421971fbf',
        avatar: 'images/avatars/female-02.jpg',
        name: 'Laverne Dodson',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'lavernedodson@mail.ca',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ar',
                    phoneNumber: '964 417 2318',
                    label: 'Mobile',
                },
                {
                    country: 'ar',
                    phoneNumber: '830 410 2506',
                    label: 'Work',
                },
            ],
            title: 'Television News Producer',
            company: 'Lovepad',
            birthday: '1973-09-25T12:00:00.000Z',
            address: '428 Newport Street, Neahkahnie, Arkansas, PO8324',
        },
        attachments: _attachments,
    },
    {
        id: 'bf172879-423a-4fd6-8df3-6d1938bbfe1f',
        avatar: 'images/avatars/male-06.jpg',
        name: 'Edwards Mckenzie',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'edwardsmckenzie@mail.org',
                    label: 'Personal',
                },
                {
                    email: 'mckenzie.edwards@bugsall.io',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'pe',
                    phoneNumber: '934 519 2903',
                    label: 'Mobile',
                },
                {
                    country: 'pe',
                    phoneNumber: '989 489 3662',
                    label: 'Work',
                },
                {
                    country: 'pe',
                    phoneNumber: '813 461 2790',
                    label: 'Home',
                },
            ],
            title: 'Legal Assistant',
            company: 'Bugsall',
            birthday: '1988-07-27T12:00:00.000Z',
            address: '384 Polhemus Place, Dalton, Palau, PO6038',
        },
        attachments: _attachments,
    },
    {
        id: '1eaa3213-ece2-4ba6-8e15-eb36ca388f50',
        avatar: 'images/avatars/female-03.jpg',
        name: 'Trudy Berg',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'trudyberg@mail.us',
                    label: 'Personal',
                },
                {
                    email: 'berg.trudy@satiance.tv',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ls',
                    phoneNumber: '912 539 2770',
                    label: 'Mobile',
                },
            ],
            title: 'Meteorologist',
            company: 'Satiance',
            birthday: '1989-12-15T12:00:00.000Z',
            address: '945 Jerome Avenue, Riceville, North Carolina, PO1625',
        },
        attachments: _attachments,
    },
    {
        id: 'abd9e78b-9e96-428f-b3ff-4d934c401bee',
        avatar: 'images/avatars/female-04.jpg',
        name: 'Elsie Melendez',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'elsiemelendez@mail.com',
                    label: 'Personal',
                },
                {
                    email: 'melendez.elsie@chillium.name',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tg',
                    phoneNumber: '907 515 3007',
                    label: 'Mobile',
                },
                {
                    country: 'tg',
                    phoneNumber: '967 534 2803',
                    label: 'Work',
                },
            ],
            title: 'Fundraising Director',
            company: 'Chillium',
            birthday: '1980-06-28T12:00:00.000Z',
            address: '428 Varanda Place, Veyo, Oklahoma, PO6188',
        },
        attachments: _attachments,
    },
    {
        id: 'efae92cc-3bd1-4c6a-a395-b6760c69bd55',
        avatar: 'images/avatars/male-07.jpg',
        name: 'Lamb Underwood',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'lambunderwood@mail.me',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'pf',
                    phoneNumber: '855 517 2767',
                    label: 'Mobile',
                },
                {
                    country: 'pf',
                    phoneNumber: '906 442 3593',
                    label: 'Work',
                },
                {
                    country: 'pf',
                    phoneNumber: '905 402 2121',
                    label: 'Home',
                },
            ],
            title: 'Legal Assistant',
            company: 'Exotechno',
            birthday: '1990-07-26T12:00:00.000Z',
            address: '609 Greenpoint Avenue, Beason, Vermont, PO5229',
        },
        attachments: _attachments,
    },
    {
        id: 'bde636a7-c3d2-4bff-939a-aab11df1516b',
        avatar: null,
        name: 'Tessa Valdez',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'tessavaldez@mail.info',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'dz',
                    phoneNumber: '892 430 2631',
                    label: 'Mobile',
                },
                {
                    country: 'dz',
                    phoneNumber: '997 525 2354',
                    label: 'Work',
                },
                {
                    country: 'dz',
                    phoneNumber: '907 472 2857',
                    label: 'Home',
                },
            ],
            title: 'Banker Mason',
            company: 'Securia',
            birthday: '1994-01-10T12:00:00.000Z',
            address: '183 Crosby Avenue, Blanco, Mississippi, PO3463',
        },
        attachments: _attachments,
    },
    {
        id: '6519600a-5eaa-45f8-8bed-c46fddb3b26a',
        background: 'images/cards/24-640x480.jpg',
        name: 'Mcleod Wagner',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'mcleodwagner@mail.biz',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'at',
                    phoneNumber: '977 590 2773',
                    label: 'Mobile',
                },
                {
                    country: 'at',
                    phoneNumber: '828 496 3813',
                    label: 'Work',
                },
                {
                    country: 'at',
                    phoneNumber: '831 432 2512',
                    label: 'Home',
                },
            ],
            company: 'Inrt',
            birthday: '1980-12-03T12:00:00.000Z',
            address: '736 Glen Street, Kaka, West Virginia, PO9350',
        },
        attachments: _attachments,
    },
    {
        id: '6d80a6f6-2884-4ac4-9c73-06b82c220017',
        avatar: 'images/avatars/female-06.jpg',
        name: 'Kristie Hall',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'kristiehall@mail.co.uk',
                    label: 'Personal',
                },
                {
                    email: 'hall.kristie@austech.net',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tn',
                    phoneNumber: '841 530 3641',
                    label: 'Mobile',
                },
                {
                    country: 'tn',
                    phoneNumber: '941 410 3743',
                    label: 'Work',
                },
                {
                    country: 'tn',
                    phoneNumber: '938 599 3850',
                    label: 'Home',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Austech',
            birthday: '1975-08-31T12:00:00.000Z',
            address: '547 Revere Place, Hoehne, New Hampshire, PO2125',
        },
        attachments: _attachments,
    },
    {
        id: '35190d23-036e-44ef-b545-cc744c626edd',
        avatar: 'images/avatars/female-07.jpg',
        name: 'Shannon Kennedy',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'shannonkennedy@mail.ca',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'gb',
                    phoneNumber: '899 508 2992',
                    label: 'Mobile',
                },
                {
                    country: 'gb',
                    phoneNumber: '834 499 3354',
                    label: 'Work',
                },
                {
                    country: 'gb',
                    phoneNumber: '834 526 3388',
                    label: 'Home',
                },
            ],
            title: 'Gas Meter Mechanic',
            company: 'Eventix',
            birthday: '1994-09-07T12:00:00.000Z',
            address: '480 Chase Court, Edinburg, Kansas, PO5357',
        },
        attachments: _attachments,
    },
    {
        id: 'b018c194-68ec-4915-ab56-e9f3bd2d98db',
        avatar: 'images/avatars/female-08.jpg',
        name: 'Martha Swanson',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'marthaswanson@mail.org',
                    label: 'Personal',
                },
                {
                    email: 'swanson.martha@sequitur.io',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'gb',
                    phoneNumber: '844 480 3309',
                    label: 'Mobile',
                },
                {
                    country: 'gb',
                    phoneNumber: '981 591 3239',
                    label: 'Work',
                },
                {
                    country: 'gb',
                    phoneNumber: '923 484 3147',
                    label: 'Home',
                },
            ],
            title: 'Short Story Writer',
            company: 'Sequitur',
            birthday: '1993-12-31T12:00:00.000Z',
            address: '595 Howard Place, Convent, Rhode Island, PO6993',
        },
        attachments: _attachments,
    },
    {
        id: 'b7c355e9-e003-467e-82d2-4f6978c1a696',
        avatar: 'images/avatars/female-09.jpg',
        name: 'Jacklyn Morgan',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'jacklynmorgan@mail.us',
                    label: 'Personal',
                },
                {
                    email: 'morgan.jacklyn@shopabout.tv',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'so',
                    phoneNumber: '974 542 2061',
                    label: 'Mobile',
                },
            ],
            title: 'Animal Sitter',
            company: 'Shopabout',
            birthday: '1976-09-30T12:00:00.000Z',
            address: '971 Conover Street, Statenville, Louisiana, PO6622',
        },
        attachments: _attachments,
    },
    {
        id: 'cfa07b7c-93d1-42e7-9592-493d9efc78ae',
        avatar: 'images/avatars/female-10.jpg',
        name: 'Tonya Bowers',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'tonyabowers@mail.com',
                    label: 'Personal',
                },
                {
                    email: 'bowers.tonya@tourmania.name',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tv',
                    phoneNumber: '922 585 2914',
                    label: 'Mobile',
                },
                {
                    country: 'tv',
                    phoneNumber: '913 538 2961',
                    label: 'Work',
                },
            ],
            title: 'Track Service Worker',
            company: 'Tourmania',
            birthday: '1976-06-14T12:00:00.000Z',
            address: '197 Marconi Place, Welda, Delaware, PO6061',
        },
        attachments: _attachments,
    },
    {
        id: '00feeb63-c83a-4655-a37e-a07da10cfa1c',
        avatar: 'images/avatars/female-11.jpg',
        name: 'Latonya Cruz',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'latonyacruz@mail.me',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tm',
                    phoneNumber: '981 508 2080',
                    label: 'Mobile',
                },
                {
                    country: 'tm',
                    phoneNumber: '817 425 2052',
                    label: 'Work',
                },
                {
                    country: 'tm',
                    phoneNumber: '939 434 3805',
                    label: 'Home',
                },
            ],
            title: 'Motor Winder',
            company: 'Zilch',
            birthday: '1967-11-28T12:00:00.000Z',
            address: '775 Dahill Road, Iberia, California, PO2169',
        },
        attachments: _attachments,
    },
    {
        id: '142abf21-e635-4a7d-9330-e57f66adcdbe',
        avatar: 'images/avatars/female-12.jpg',
        name: 'Evangelina Mcclain',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'evangelinamcclain@mail.info',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ck',
                    phoneNumber: '992 583 3187',
                    label: 'Mobile',
                },
                {
                    country: 'ck',
                    phoneNumber: '881 472 3297',
                    label: 'Work',
                },
                {
                    country: 'ck',
                    phoneNumber: '846 477 3596',
                    label: 'Home',
                },
            ],
            title: 'Congressional Representative',
            company: 'Straloy',
            birthday: '1976-02-15T12:00:00.000Z',
            address: '305 Columbia Street, Dupuyer, Puerto Rico, PO8744',
        },
        attachments: _attachments,
    },
    {
        id: 'e4f255a3-b5dd-45a7-975f-c399604a399a',
        avatar: 'images/avatars/male-09.jpg',
        name: 'Herring Gonzales',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'herringgonzales@mail.biz',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ai',
                    phoneNumber: '995 411 2513',
                    label: 'Mobile',
                },
                {
                    country: 'ai',
                    phoneNumber: '839 492 2760',
                    label: 'Work',
                },
            ],
            title: 'Gas Meter Mechanic',
            company: 'Cubix',
            birthday: '1995-02-16T12:00:00.000Z',
            address: '195 Brooklyn Road, Jeff, Marshall Islands, PO2943',
        },
        attachments: _attachments,
    },
    {
        id: 'ab4f712d-d712-41a8-b567-be4c66c349a3',
        avatar: 'images/avatars/female-13.jpg',
        name: 'Alyce Cash',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'alycecash@mail.co.uk',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ht',
                    phoneNumber: '969 499 3077',
                    label: 'Mobile',
                },
                {
                    country: 'ht',
                    phoneNumber: '907 513 2784',
                    label: 'Work',
                },
            ],
            title: 'Weather Analyst',
            company: 'Qnekt',
            birthday: '1973-12-19T12:00:00.000Z',
            address: '964 Henry Street, Eureka, Indiana, PO1035',
        },
        attachments: _attachments,
    },
    {
        id: '5d067800-c301-46c6-a7f7-28dc89d9a554',
        avatar: null,
        name: 'Kristine Pacheco',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'kristinepacheco@mail.net',
                    label: 'Personal',
                },
                {
                    email: 'pacheco.kristine@vurbo.ca',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'mm',
                    phoneNumber: '977 516 2492',
                    label: 'Mobile',
                },
            ],
            title: 'Short Story Writer',
            company: 'Vurbo',
            birthday: '1985-10-22T12:00:00.000Z',
            address: '622 Dodworth Street, Rose, Arizona, PO9530',
        },
        attachments: _attachments,
    },
    {
        id: 'c500255a-1173-47d0-a0e4-4944d48fc12a',
        avatar: 'images/avatars/male-10.jpg',
        name: 'English Haney',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'englishhaney@mail.org',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'lb',
                    phoneNumber: '989 567 3834',
                    label: 'Mobile',
                },
            ],
            title: 'Meteorologist',
            company: 'Photobin',
            birthday: '1969-09-05T12:00:00.000Z',
            address: '579 Pooles Lane, Belleview, Montana, PO4106',
        },
        attachments: _attachments,
    },
    {
        id: 'b62359fd-f2a8-46e6-904e-31052d1cd675',
        avatar: 'images/avatars/male-11.jpg',
        name: 'Joseph Strickland',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'josephstrickland@mail.io',
                    label: 'Personal',
                },
                {
                    email: 'strickland.joseph@bytrex.us',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'jo',
                    phoneNumber: '990 450 2729',
                    label: 'Mobile',
                },
            ],
            title: 'Hotel Manager',
            company: 'Bytrex',
            birthday: '1991-09-08T12:00:00.000Z',
            address: '844 Ellery Street, Hondah, Texas, PO1272',
        },
        attachments: _attachments,
    },
    {
        id: '16b9e696-ea95-4dd8-86c4-3caf705a1dc6',
        avatar: 'images/avatars/male-12.jpg',
        name: 'Nunez Faulkner',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'nunezfaulkner@mail.tv',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'xk',
                    phoneNumber: '909 552 3327',
                    label: 'Mobile',
                },
            ],
            title: 'Hotel Manager',
            company: 'Buzzopia',
            birthday: '1982-01-23T12:00:00.000Z',
            address: '614 Herkimer Court, Darrtown, Nebraska, PO9308',
        },
        attachments: _attachments,
    },
    {
        id: '19662ecf-0686-4aad-a46c-24b552eb2ff5',
        avatar: 'images/avatars/female-15.jpg',
        name: 'Juana Morrow',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'juanamorrow@mail.com',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ee',
                    phoneNumber: '868 438 3943',
                    label: 'Mobile',
                },
            ],
            title: 'Meteorologist',
            company: 'Lyria',
            birthday: '1992-03-29T12:00:00.000Z',
            address: '663 Drew Street, Juntura, Georgia, PO9857',
        },
        attachments: _attachments,
    },
    {
        id: '26dfe954-8bf3-45ee-b285-1d0a88c8d3ea',
        avatar: 'images/avatars/male-13.jpg',
        name: 'Lara Gaines',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'laragaines@mail.name',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'mr',
                    phoneNumber: '891 498 2043',
                    label: 'Mobile',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Acruex',
            birthday: '1961-06-07T12:00:00.000Z',
            address: '762 Troutman Street, Drummond, Oregon, PO6973',
        },
        attachments: _attachments,
    },
    {
        id: 'd6462af2-c488-4de7-9b26-3845bd2983f9',
        avatar: 'images/avatars/male-14.jpg',
        name: 'Johnston Riddle',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'johnstonriddle@mail.me',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bt',
                    phoneNumber: '979 541 2691',
                    label: 'Mobile',
                },
                {
                    country: 'bt',
                    phoneNumber: '909 407 3887',
                    label: 'Work',
                },
                {
                    country: 'bt',
                    phoneNumber: '864 557 3128',
                    label: 'Home',
                },
            ],
            title: 'Hotel Manager',
            company: 'Xleen',
            birthday: '1972-09-13T12:00:00.000Z',
            address:
                '674 Bryant Street, Grahamtown, Federated States Of Micronesia, PO2757',
        },
        attachments: _attachments,
    },
    {
        id: 'a1723c04-69fe-4573-a135-6645658afe76',
        avatar: null,
        name: 'Vargas Gardner',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'vargasgardner@mail.info',
                    label: 'Personal',
                },
                {
                    email: 'gardner.vargas@cosmosis.biz',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bi',
                    phoneNumber: '855 456 2754',
                    label: 'Mobile',
                },
            ],
            title: 'Bindery Machine Operator',
            company: 'Cosmosis',
            birthday: '1979-10-21T12:00:00.000Z',
            address: '869 Seton Place, Chemung, Maine, PO8109',
        },
        attachments: _attachments,
    },
    {
        id: '823e6166-c0c8-4373-9270-8a0d17489a08',
        avatar: 'images/avatars/male-16.jpg',
        name: 'Mccall Day',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'mccallday@mail.co.uk',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'se',
                    phoneNumber: '993 504 3286',
                    label: 'Mobile',
                },
                {
                    country: 'se',
                    phoneNumber: '924 434 2238',
                    label: 'Work',
                },
                {
                    country: 'se',
                    phoneNumber: '816 466 2634',
                    label: 'Home',
                },
            ],
            title: 'Historiographer',
            company: 'Nipaz',
            birthday: '1964-03-05T12:00:00.000Z',
            address: '854 Hanover Place, Harleigh, New Jersey, PO9459',
        },
        attachments: _attachments,
    },
    {
        id: '2c37ed00-427a-46d7-8f8f-d711c768d1ee',
        avatar: 'images/avatars/male-17.jpg',
        name: 'Silva Foster',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'silvafoster@mail.net',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bn',
                    phoneNumber: '916 511 3837',
                    label: 'Mobile',
                },
                {
                    country: 'bn',
                    phoneNumber: '949 564 3247',
                    label: 'Work',
                },
            ],
            title: 'Insurance Analyst',
            company: 'Extrawear',
            birthday: '1980-04-29T12:00:00.000Z',
            address: '137 Bridge Street, Sisquoc, District Of Columbia, PO4105',
        },
        attachments: _attachments,
    },
    {
        id: '944764c0-b261-4428-9188-bbd3022d66a8',
        avatar: 'images/avatars/female-16.jpg',
        name: 'Cathryn Snider',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'cathrynsnider@mail.ca',
                    label: 'Personal',
                },
                {
                    email: 'snider.cathryn@phormula.org',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'na',
                    phoneNumber: '896 471 3036',
                    label: 'Mobile',
                },
                {
                    country: 'na',
                    phoneNumber: '851 491 3567',
                    label: 'Work',
                },
                {
                    country: 'na',
                    phoneNumber: '805 487 2016',
                    label: 'Home',
                },
            ],
            title: 'Short Story Writer',
            company: 'Phormula',
            birthday: '1981-06-09T12:00:00.000Z',
            address: '528 Glenmore Avenue, Elrama, Illinois, PO2952',
        },
        attachments: _attachments,
    },
    {
        id: 'f2b3c756-5ad2-4d4b-aee5-b32c91457128',
        avatar: null,
        name: 'Mooney Cantrell',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'mooneycantrell@mail.io',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bh',
                    phoneNumber: '915 577 3020',
                    label: 'Mobile',
                },
                {
                    country: 'bh',
                    phoneNumber: '923 431 3594',
                    label: 'Work',
                },
            ],
            title: 'Fundraising Director',
            company: 'Crustatia',
            birthday: '1968-12-07T12:00:00.000Z',
            address: '277 Coventry Road, Fairforest, Nevada, PO6031',
        },
        attachments: _attachments,
    },
    {
        id: '54b1c201-4b2b-4be0-ad70-a6413e9628cd',
        avatar: 'images/avatars/female-17.jpg',
        name: 'Saundra Murphy',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'saundramurphy@mail.us',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'mt',
                    phoneNumber: '902 529 2999',
                    label: 'Mobile',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Zilencio',
            birthday: '1983-11-07T12:00:00.000Z',
            address: '557 Monroe Street, Mayfair, Maryland, PO7200',
        },
        attachments: _attachments,
    },
    {
        id: 'faf979c7-a13b-445a-b30a-08845f5fa90e',
        avatar: 'images/avatars/female-18.jpg',
        name: 'Enid Sparks',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'enidsparks@mail.tv',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bh',
                    phoneNumber: '813 410 3258',
                    label: 'Mobile',
                },
                {
                    country: 'bh',
                    phoneNumber: '877 501 2767',
                    label: 'Work',
                },
            ],
            title: 'Historiographer',
            company: 'Skybold',
            birthday: '1984-05-04T12:00:00.000Z',
            address: '219 Village Court, Keyport, Alabama, PO7776',
        },
        attachments: _attachments,
    },
    {
        id: '2bfa2be5-7688-48d5-b5ac-dc0d9ac97f14',
        avatar: null,
        name: 'Nadia Mcknight',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'nadiamcknight@mail.com',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tk',
                    phoneNumber: '943 511 2203',
                    label: 'Mobile',
                },
                {
                    country: 'tk',
                    phoneNumber: '817 578 2993',
                    label: 'Work',
                },
            ],
            title: 'Legal Assistant',
            company: 'Pearlesex',
            birthday: '1973-10-06T12:00:00.000Z',
            address: '448 Berriman Street, Reinerton, Washington, PO6704',
        },
        attachments: _attachments,
    },
    {
        id: '77a4383b-b5a5-4943-bc46-04c3431d1566',
        avatar: 'images/avatars/male-19.jpg',
        name: 'Best Blackburn',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'bestblackburn@mail.name',
                    label: 'Personal',
                },
                {
                    email: 'blackburn.best@beadzza.me',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'gl',
                    phoneNumber: '814 498 3701',
                    label: 'Mobile',
                },
            ],
            title: 'Hotel Manager',
            company: 'Beadzza',
            birthday: '1987-06-07T12:00:00.000Z',
            address: '578 Tampa Court, Wescosville, Ohio, PO4108',
        },
        attachments: _attachments,
    },
    {
        id: '8bb0f597-673a-47ca-8c77-2f83219cb9af',
        avatar: null,
        name: 'Duncan Carver',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'duncancarver@mail.info',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'jm',
                    phoneNumber: '968 547 2111',
                    label: 'Mobile',
                },
                {
                    country: 'jm',
                    phoneNumber: '968 433 3120',
                    label: 'Work',
                },
                {
                    country: 'jm',
                    phoneNumber: '905 425 2777',
                    label: 'Home',
                },
            ],
            title: 'Historiographer',
            company: 'Hotcakes',
            birthday: '1980-09-15T12:00:00.000Z',
            address: '931 Bristol Street, Why, South Carolina, PO9700',
        },
        attachments: _attachments,
    },
    {
        id: 'c318e31f-1d74-49c5-8dae-2bc5805e2fdb',
        avatar: 'images/avatars/male-01.jpg',
        name: 'Martin Richards',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'martinrichards@mail.biz',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'mg',
                    phoneNumber: '902 500 2668',
                    label: 'Mobile',
                },
                {
                    country: 'mg',
                    phoneNumber: '947 559 2919',
                    label: 'Work',
                },
                {
                    country: 'mg',
                    phoneNumber: '934 434 3768',
                    label: 'Home',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Overfork',
            birthday: '1977-04-12T12:00:00.000Z',
            address: '268 Hutchinson Court, Drytown, Florida, PO3041',
        },
        attachments: _attachments,
    },
    {
        id: '0a8bc517-631a-4a93-aacc-000fa2e8294c',
        avatar: 'images/avatars/female-20.jpg',
        name: 'Candice Munoz',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'candicemunoz@mail.co.uk',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'fm',
                    phoneNumber: '838 562 2769',
                    label: 'Mobile',
                },
            ],
            title: 'Legal Assistant',
            company: 'Eclipto',
            birthday: '1976-09-09T12:00:00.000Z',
            address: '946 Remsen Street, Caroline, New Mexico, PO3247',
        },
        attachments: _attachments,
    },
    {
        id: 'a4c9945a-757b-40b0-8942-d20e0543cabd',
        avatar: 'images/avatars/female-01.jpg',
        name: 'Vickie Mosley',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'vickiemosley@mail.net',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tr',
                    phoneNumber: '939 555 3054',
                    label: 'Mobile',
                },
                {
                    country: 'tr',
                    phoneNumber: '852 486 2053',
                    label: 'Work',
                },
            ],
            title: 'Bindery Machine Operator',
            company: 'Strozen',
            birthday: '1989-06-21T12:00:00.000Z',
            address: '397 Vandalia Avenue, Rockingham, Michigan, PO8089',
        },
        attachments: _attachments,
    },
    {
        id: 'b8258ccf-48b5-46a2-9c95-e0bd7580c645',
        avatar: 'images/avatars/female-02.jpg',
        name: 'Tina Harris',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'tinaharris@mail.ca',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'gp',
                    phoneNumber: '933 464 2431',
                    label: 'Mobile',
                },
                {
                    country: 'gp',
                    phoneNumber: '894 535 3609',
                    label: 'Work',
                },
            ],
            title: 'Short Story Writer',
            company: 'Gallaxia',
            birthday: '1976-09-10T12:00:00.000Z',
            address: '821 Beverly Road, Tyro, Colorado, PO4248',
        },
        attachments: _attachments,
    },
    {
        id: 'f004ea79-98fc-436c-9ba5-6cfe32fe583d',
        avatar: 'images/avatars/male-02.jpg',
        name: 'Holt Manning',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'holtmanning@mail.org',
                    label: 'Personal',
                },
                {
                    email: 'manning.holt@idetica.io',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'nz',
                    phoneNumber: '822 531 2600',
                    label: 'Mobile',
                },
                {
                    country: 'nz',
                    phoneNumber: '922 549 2094',
                    label: 'Work',
                },
            ],
            title: 'Fundraising Director',
            company: 'Idetica',
            birthday: '1973-11-08T12:00:00.000Z',
            address: '364 Porter Avenue, Delshire, Missouri, PO8911',
        },
        attachments: _attachments,
    },
    {
        id: '8b69fe2d-d7cc-4a3d-983d-559173e37d37',
        background: 'images/cards/28-640x480.jpg',
        name: 'Misty Ramsey',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'mistyramsey@mail.us',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'kp',
                    phoneNumber: '990 457 2106',
                    label: 'Mobile',
                },
                {
                    country: 'kp',
                    phoneNumber: '918 550 2946',
                    label: 'Work',
                },
            ],
            company: 'Grupoli',
            birthday: '1969-08-10T12:00:00.000Z',
            address: '101 Sackett Street, Naomi, Tennessee, PO6335',
        },
        attachments: _attachments,
    },
    {
        id: 'cdcc62e4-1520-4ccc-803d-52868c7e01ba',
        avatar: 'images/avatars/female-04.jpg',
        name: 'Dee Alvarado',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'deealvarado@mail.tv',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'nu',
                    phoneNumber: '855 445 2483',
                    label: 'Mobile',
                },
                {
                    country: 'nu',
                    phoneNumber: '858 415 2860',
                    label: 'Work',
                },
                {
                    country: 'nu',
                    phoneNumber: '968 587 2752',
                    label: 'Home',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Tsunamia',
            birthday: '1996-06-17T12:00:00.000Z',
            address: '956 Pierrepont Street, Crumpler, Hawaii, PO3299',
        },
        attachments: _attachments,
    },
    {
        id: 'e2946946-b4b5-4fd7-bab4-62c38cdff2f1',
        avatar: 'images/avatars/female-05.jpg',
        name: 'Samantha Jacobson',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'samanthajacobson@mail.com',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'es',
                    phoneNumber: '879 591 3327',
                    label: 'Mobile',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Emoltra',
            birthday: '1972-02-04T12:00:00.000Z',
            address: '384 Love Lane, Dyckesville, New York, PO4115',
        },
        attachments: _attachments,
    },
    {
        id: 'fdc77706-6ba2-4397-b2f8-a9a0b6495153',
        avatar: 'images/avatars/female-06.jpg',
        name: 'Rhea Landry',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'rhealandry@mail.name',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'jp',
                    phoneNumber: '906 579 3698',
                    label: 'Mobile',
                },
                {
                    country: 'jp',
                    phoneNumber: '841 475 2681',
                    label: 'Work',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Comtent',
            birthday: '1988-05-22T12:00:00.000Z',
            address: '725 Arlington Avenue, Mathews, Wyoming, PO4562',
        },
        attachments: _attachments,
    },
    {
        id: '12148fa2-e0a4-49fb-b3c5-daeecdb5180a',
        avatar: 'images/avatars/female-07.jpg',
        name: 'Olga Rhodes',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'olgarhodes@mail.me',
                    label: 'Personal',
                },
                {
                    email: 'rhodes.olga@moreganic.info',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tl',
                    phoneNumber: '971 514 3366',
                    label: 'Mobile',
                },
                {
                    country: 'tl',
                    phoneNumber: '807 480 2033',
                    label: 'Work',
                },
                {
                    country: 'tl',
                    phoneNumber: '810 528 3783',
                    label: 'Home',
                },
            ],
            title: 'Pastry Baker',
            company: 'Moreganic',
            birthday: '1971-08-13T12:00:00.000Z',
            address: '253 Beard Street, Staples, Massachusetts, PO8089',
        },
        attachments: _attachments,
    },
    {
        id: '07dd64eb-8b8f-4765-a16c-8db083c45096',
        avatar: 'images/avatars/female-08.jpg',
        name: 'Lorraine Pennington',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'lorrainepennington@mail.biz',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'fm',
                    phoneNumber: '932 404 3308',
                    label: 'Mobile',
                },
                {
                    country: 'fm',
                    phoneNumber: '979 550 3200',
                    label: 'Work',
                },
                {
                    country: 'fm',
                    phoneNumber: '868 557 3568',
                    label: 'Home',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Marvane',
            birthday: '1967-06-10T12:00:00.000Z',
            address: '962 Whitney Avenue, Sussex, North Dakota, PO5796',
        },
        attachments: _attachments,
    },
    {
        id: '81fdc48c-5572-4123-8a73-71b7892120de',
        avatar: 'images/avatars/female-09.jpg',
        name: 'Earlene Rosales',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'earlenerosales@mail.co.uk',
                    label: 'Personal',
                },
                {
                    email: 'rosales.earlene@softmicro.net',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ki',
                    phoneNumber: '927 589 3619',
                    label: 'Mobile',
                },
            ],
            title: 'Historiographer',
            company: 'Softmicro',
            birthday: '1960-11-13T12:00:00.000Z',
            address: '981 Kingston Avenue, Topaz, Connecticut, PO6866',
        },
        attachments: _attachments,
    },
    {
        id: 'f8bbf6be-d49a-41a3-bb80-3d51df84c12b',
        avatar: 'images/avatars/female-10.jpg',
        name: 'Marcia Hatfield',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'marciahatfield@mail.ca',
                    label: 'Personal',
                },
                {
                    email: 'hatfield.marcia@datagen.org',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'no',
                    phoneNumber: '883 432 3718',
                    label: 'Mobile',
                },
                {
                    country: 'no',
                    phoneNumber: '934 516 2135',
                    label: 'Work',
                },
                {
                    country: 'no',
                    phoneNumber: '923 596 3843',
                    label: 'Home',
                },
            ],
            title: 'Track Service Worker',
            company: 'Datagen',
            birthday: '1980-02-26T12:00:00.000Z',
            address: '802 Preston Court, Waikele, Pennsylvania, PO7421',
        },
        attachments: _attachments,
    },
    {
        id: 'cd482941-3eaf-4560-ac37-56a9296025df',
        avatar: 'images/avatars/female-11.jpg',
        name: 'Liliana Ayala',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'lilianaayala@mail.io',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bd',
                    phoneNumber: '936 590 2412',
                    label: 'Mobile',
                },
            ],
            title: 'Insurance Analyst',
            company: 'Pharmex',
            birthday: '1988-04-27T12:00:00.000Z',
            address: '935 Guider Avenue, Kipp, Wisconsin, PO5282',
        },
        attachments: _attachments,
    },
    {
        id: '22f18d47-ff8d-440e-888d-a1747c093052',
        avatar: 'images/avatars/female-12.jpg',
        name: 'Alice Harding',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'aliceharding@mail.us',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'sx',
                    phoneNumber: '881 472 3113',
                    label: 'Mobile',
                },
                {
                    country: 'sx',
                    phoneNumber: '974 548 3124',
                    label: 'Work',
                },
                {
                    country: 'sx',
                    phoneNumber: '800 518 3615',
                    label: 'Home',
                },
            ],
            title: 'Track Service Worker',
            company: 'Futurity',
            birthday: '1985-09-17T12:00:00.000Z',
            address: '387 Holt Court, Thomasville, Alaska, PO2867',
        },
        attachments: _attachments,
    },
    {
        id: 'a9a9f382-e4c3-42fb-9fe9-65aa534732b5',
        avatar: 'images/avatars/female-13.jpg',
        name: 'Francisca Perkins',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'franciscaperkins@mail.tv',
                    label: 'Personal',
                },
                {
                    email: 'perkins.francisca@overplex.com',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'au',
                    phoneNumber: '830 430 3437',
                    label: 'Mobile',
                },
                {
                    country: 'au',
                    phoneNumber: '868 538 2886',
                    label: 'Work',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Overplex',
            birthday: '1966-08-14T12:00:00.000Z',
            address: '733 Delmonico Place, Belvoir, Virginia, PO7102',
        },
        attachments: _attachments,
    },
    {
        id: '0222b24b-c288-48d1-b356-0f087fa172f8',
        avatar: null,
        name: 'Warren Gates',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'warrengates@mail.name',
                    label: 'Personal',
                },
                {
                    email: 'gates.warren@qualitex.me',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'gt',
                    phoneNumber: '847 513 2248',
                    label: 'Mobile',
                },
                {
                    country: 'gt',
                    phoneNumber: '866 591 3665',
                    label: 'Work',
                },
                {
                    country: 'gt',
                    phoneNumber: '877 539 3840',
                    label: 'Home',
                },
            ],
            title: 'Banker Mason',
            company: 'Qualitex',
            birthday: '1977-02-23T12:00:00.000Z',
            address: '713 Fane Court, Lemoyne, Kentucky, PO3601',
        },
        attachments: _attachments,
    },
    {
        id: '0630f1ca-cdb9-405d-b134-68f733334089',
        avatar: 'images/avatars/female-14.jpg',
        name: 'Maryann Mcintyre',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'maryannmcintyre@mail.info',
                    label: 'Personal',
                },
                {
                    email: 'mcintyre.maryann@aquafire.biz',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bf',
                    phoneNumber: '861 419 2752',
                    label: 'Mobile',
                },
                {
                    country: 'bf',
                    phoneNumber: '935 553 3031',
                    label: 'Work',
                },
            ],
            title: 'Fundraising Director',
            company: 'Aquafire',
            birthday: '1963-04-07T12:00:00.000Z',
            address: '698 Brooklyn Avenue, Dixonville, Utah, PO2712',
        },
        attachments: _attachments,
    },
    {
        id: '999c24f3-7bb8-4a01-85ca-2fca7863c57e',
        avatar: 'images/avatars/female-15.jpg',
        name: 'Sharon Marshall',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'sharonmarshall@mail.co.uk',
                    label: 'Personal',
                },
                {
                    email: 'marshall.sharon@utara.net',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'fo',
                    phoneNumber: '947 441 2999',
                    label: 'Mobile',
                },
                {
                    country: 'fo',
                    phoneNumber: '984 441 2615',
                    label: 'Work',
                },
                {
                    country: 'fo',
                    phoneNumber: '824 541 2714',
                    label: 'Home',
                },
            ],
            title: 'Legal Assistant',
            company: 'Utara',
            birthday: '1960-01-26T12:00:00.000Z',
            address: '923 Ivan Court, Hatteras, Idaho, PO7573',
        },
        attachments: _attachments,
    },
    {
        id: '7e8e1f1e-d19f-45c7-86bd-6fef599dae71',
        avatar: 'images/avatars/female-16.jpg',
        name: 'Margo Witt',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'margowitt@mail.ca',
                    label: 'Personal',
                },
                {
                    email: 'witt.margo@norsul.org',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'ao',
                    phoneNumber: '992 596 3391',
                    label: 'Mobile',
                },
                {
                    country: 'ao',
                    phoneNumber: '950 489 2505',
                    label: 'Work',
                },
                {
                    country: 'ao',
                    phoneNumber: '891 540 2231',
                    label: 'Home',
                },
            ],
            title: 'Television News Producer',
            company: 'Norsul',
            birthday: '1975-08-31T12:00:00.000Z',
            address: '539 Rockaway Avenue, Whitmer, Guam, PO4871',
        },
        attachments: _attachments,
    },
    {
        id: 'bedcb6a2-da83-4631-866a-77d10d239477',
        avatar: 'images/avatars/male-04.jpg',
        name: 'Alvarado Turner',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'alvaradoturner@mail.io',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'lv',
                    phoneNumber: '961 537 3956',
                    label: 'Mobile',
                },
            ],
            title: 'Fundraising Director',
            company: 'Geologix',
            birthday: '1985-12-08T12:00:00.000Z',
            address: '233 Willmohr Street, Cressey, Iowa, PO1962',
        },
        attachments: _attachments,
    },
    {
        id: '66f9de1b-f842-4d4c-bb59-f97e91db0462',
        avatar: 'images/avatars/male-05.jpg',
        name: 'Maldonado Rodriquez',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'maldonadorodriquez@mail.us',
                    label: 'Personal',
                },
                {
                    email: 'rodriquez.maldonado@zentility.tv',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'et',
                    phoneNumber: '811 502 3398',
                    label: 'Mobile',
                },
                {
                    country: 'et',
                    phoneNumber: '877 402 2443',
                    label: 'Work',
                },
                {
                    country: 'et',
                    phoneNumber: '949 536 3451',
                    label: 'Home',
                },
            ],
            title: 'Dental Laboratory Worker',
            company: 'Zentility',
            birthday: '1993-06-01T12:00:00.000Z',
            address: '916 Cobek Court, Morningside, South Dakota, PO2019',
        },
        attachments: _attachments,
    },
    {
        id: '9cb0ea57-3461-4182-979b-593b0c1ec6c3',
        avatar: 'images/avatars/male-06.jpg',
        name: 'Tran Duke',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'tranduke@mail.com',
                    label: 'Personal',
                },
                {
                    email: 'duke.tran@splinx.name',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'si',
                    phoneNumber: '837 503 2254',
                    label: 'Mobile',
                },
                {
                    country: 'si',
                    phoneNumber: '893 405 3190',
                    label: 'Work',
                },
                {
                    country: 'si',
                    phoneNumber: '931 402 3874',
                    label: 'Home',
                },
            ],
            title: 'Legal Assistant',
            company: 'Splinx',
            birthday: '1976-04-27T12:00:00.000Z',
            address: '405 Canarsie Road, Richville, Virgin Islands, PO2744',
        },
        attachments: _attachments,
    },
    {
        id: '2fb89a90-5622-4b5b-8df3-d49b85905392',
        avatar: null,
        name: 'Estela Lyons',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'estelalyons@mail.me',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'vg',
                    phoneNumber: '864 459 3205',
                    label: 'Mobile',
                },
                {
                    country: 'vg',
                    phoneNumber: '886 524 2880',
                    label: 'Work',
                },
                {
                    country: 'vg',
                    phoneNumber: '815 484 3420',
                    label: 'Home',
                },
            ],
            title: 'Animal Sitter',
            company: 'Gonkle',
            birthday: '1968-03-11T12:00:00.000Z',
            address: '540 Metrotech Courtr, Garfield, American Samoa, PO2290',
        },
        attachments: _attachments,
    },
    {
        id: '8141dd08-3a6e-4770-912c-59d0ed06dde6',
        avatar: null,
        name: 'Madeleine Fletcher',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'madeleinefletcher@mail.info',
                    label: 'Personal',
                },
                {
                    email: 'fletcher.madeleine@genmom.biz',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'uy',
                    phoneNumber: '898 554 3354',
                    label: 'Mobile',
                },
            ],
            title: 'Fundraising Director',
            company: 'Genmom',
            birthday: '1970-07-15T12:00:00.000Z',
            address: '825 Cherry Street, Foscoe, Minnesota, PO7290',
        },
        attachments: _attachments,
    },
    {
        id: '7585015c-ada2-4f88-998d-9646865d1ad2',
        avatar: 'images/avatars/male-07.jpg',
        name: 'Meyer Roach',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'meyerroach@mail.co.uk',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'uz',
                    phoneNumber: '891 543 2053',
                    label: 'Mobile',
                },
                {
                    country: 'uz',
                    phoneNumber: '842 564 3671',
                    label: 'Work',
                },
                {
                    country: 'uz',
                    phoneNumber: '992 491 3514',
                    label: 'Home',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Zentime',
            birthday: '1968-10-16T12:00:00.000Z',
            address: '315 Albemarle Road, Allison, Arkansas, PO6008',
        },
        attachments: _attachments,
    },
    {
        id: '32c73a6a-67f2-48a9-b2a1-b23da83187bb',
        avatar: null,
        name: 'Bolton Obrien',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'boltonobrien@mail.net',
                    label: 'Personal',
                },
                {
                    email: 'obrien.bolton@enersol.ca',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'tn',
                    phoneNumber: '860 472 2458',
                    label: 'Mobile',
                },
                {
                    country: 'tn',
                    phoneNumber: '887 499 3580',
                    label: 'Work',
                },
            ],
            title: 'Banker Mason',
            company: 'Enersol',
            birthday: '1968-09-08T12:00:00.000Z',
            address: '818 Aviation Road, Geyserville, Palau, PO9655',
        },
        attachments: _attachments,
    },
    {
        id: '114642a2-ccb7-4cb1-ad2b-5e9b6a0c1d2e',
        avatar: 'images/avatars/male-09.jpg',
        name: 'Barber Johnson',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'barberjohnson@mail.org',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'az',
                    phoneNumber: '928 567 2521',
                    label: 'Mobile',
                },
                {
                    country: 'az',
                    phoneNumber: '898 515 2048',
                    label: 'Work',
                },
                {
                    country: 'az',
                    phoneNumber: '935 495 3348',
                    label: 'Home',
                },
            ],
            title: 'Talent Manager',
            company: 'Zounds',
            birthday: '1967-03-02T12:00:00.000Z',
            address: '386 Vernon Avenue, Dragoon, North Carolina, PO4559',
        },
        attachments: _attachments,
    },
    {
        id: '310ece7d-dbb0-45d6-9e69-14c24e50fe3d',
        avatar: 'images/avatars/male-10.jpg',
        name: 'Cervantes Kramer',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'cervanteskramer@mail.io',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'vg',
                    phoneNumber: '998 498 2507',
                    label: 'Mobile',
                },
                {
                    country: 'vg',
                    phoneNumber: '856 477 3445',
                    label: 'Work',
                },
            ],
            title: 'Motor Winder',
            company: 'Xeronk',
            birthday: '1992-09-04T12:00:00.000Z',
            address: '238 Rochester Avenue, Lydia, Oklahoma, PO3914',
        },
        attachments: _attachments,
    },
    {
        id: 'dcc673f6-de59-4715-94ed-8f64663d449b',
        avatar: 'images/avatars/female-19.jpg',
        name: 'Megan Suarez',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'megansuarez@mail.us',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bb',
                    phoneNumber: '875 422 2053',
                    label: 'Mobile',
                },
                {
                    country: 'bb',
                    phoneNumber: '861 487 2597',
                    label: 'Work',
                },
                {
                    country: 'bb',
                    phoneNumber: '873 414 3953',
                    label: 'Home',
                },
            ],
            title: 'Bindery Machine Operator',
            company: 'Cemention',
            birthday: '1984-09-08T12:00:00.000Z',
            address: '112 Tillary Street, Camptown, Vermont, PO8827',
        },
        attachments: _attachments,
    },
    {
        id: '3e4ca731-d39b-4ad9-b6e0-f84e67f4b74a',
        background: 'images/cards/26-640x480.jpg',
        name: 'Ofelia Ratliff',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'ofeliaratliff@mail.tv',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'vu',
                    phoneNumber: '978 546 3699',
                    label: 'Mobile',
                },
                {
                    country: 'vu',
                    phoneNumber: '892 551 2229',
                    label: 'Work',
                },
                {
                    country: 'vu',
                    phoneNumber: '949 495 3479',
                    label: 'Home',
                },
            ],
            company: 'Buzzmaker',
            birthday: '1988-11-11T12:00:00.000Z',
            address: '951 Hampton Avenue, Bartonsville, Mississippi, PO4232',
        },
        attachments: _attachments,
    },
    {
        id: '2012d4a5-19e4-444d-aaff-1d8b1d853650',
        avatar: 'images/avatars/female-01.jpg',
        name: 'Laurel Parker',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'laurelparker@mail.com',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'lu',
                    phoneNumber: '805 502 3677',
                    label: 'Mobile',
                },
                {
                    country: 'lu',
                    phoneNumber: '925 527 2973',
                    label: 'Work',
                },
                {
                    country: 'lu',
                    phoneNumber: '975 495 2977',
                    label: 'Home',
                },
            ],
            title: 'Fundraising Director',
            company: 'Omnigog',
            birthday: '1987-05-17T12:00:00.000Z',
            address: '157 Woodhull Street, Rutherford, West Virginia, PO6646',
        },
        attachments: _attachments,
    },
    {
        id: '012b8219-74bf-447c-af2c-66904d90a956',
        avatar: 'images/avatars/female-02.jpg',
        name: 'Tracy Delacruz',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'tracydelacruz@mail.name',
                    label: 'Personal',
                },
                {
                    email: 'delacruz.tracy@shepard.me',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'co',
                    phoneNumber: '974 428 2886',
                    label: 'Mobile',
                },
            ],
            title: 'Bindery Machine Operator',
            company: 'Shepard',
            birthday: '1963-08-10T12:00:00.000Z',
            address: '604 Merit Court, Wyano, New Hampshire, PO1641',
        },
        attachments: _attachments,
    },
    {
        id: '8b1befd2-66a7-4981-ae52-77f01b382d18',
        avatar: 'images/avatars/female-03.jpg',
        name: 'Jeannette Stanton',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'jeannettestanton@mail.info',
                    label: 'Personal',
                },
                {
                    email: 'stanton.jeannette@zentury.biz',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'dz',
                    phoneNumber: '947 561 3783',
                    label: 'Mobile',
                },
                {
                    country: 'dz',
                    phoneNumber: '917 463 3737',
                    label: 'Work',
                },
                {
                    country: 'dz',
                    phoneNumber: '835 510 2059',
                    label: 'Home',
                },
            ],
            title: 'Hotel Manager',
            company: 'Zentury',
            birthday: '1975-09-02T12:00:00.000Z',
            address: '100 Menahan Street, Snyderville, Kansas, PO1006',
        },
        attachments: _attachments,
    },
    {
        id: '844668c3-5e20-4fed-9e3a-7d274f696e61',
        avatar: 'images/avatars/female-04.jpg',
        name: 'Johnnie Cleveland',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'johnniecleveland@mail.co.uk',
                    label: 'Personal',
                },
                {
                    email: 'cleveland.johnnie@viasia.net',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'au',
                    phoneNumber: '947 468 2942',
                    label: 'Mobile',
                },
            ],
            title: 'Fundraising Director',
            company: 'Viasia',
            birthday: '1986-03-15T12:00:00.000Z',
            address: '283 Albany Avenue, Jennings, Rhode Island, PO1646',
        },
        attachments: _attachments,
    },
    {
        id: '5a01e870-8be1-45a5-b58a-ec09c06e8f28',
        avatar: 'images/avatars/female-05.jpg',
        name: 'Staci Hyde',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'stacihyde@mail.ca',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'id',
                    phoneNumber: '944 525 2944',
                    label: 'Mobile',
                },
                {
                    country: 'id',
                    phoneNumber: '877 500 2506',
                    label: 'Work',
                },
            ],
            title: 'Banker Mason',
            company: 'Zilla',
            birthday: '1975-04-22T12:00:00.000Z',
            address: '560 Dooley Street, Ellerslie, Louisiana, PO1005',
        },
        attachments: _attachments,
    },
    {
        id: '5ac1f193-f150-45f9-bfe4-b7b4e1a83ff9',
        avatar: 'images/avatars/female-06.jpg',
        name: 'Angela Gallagher',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'angelagallagher@mail.org',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'et',
                    phoneNumber: '996 514 3856',
                    label: 'Mobile',
                },
                {
                    country: 'et',
                    phoneNumber: '903 539 2049',
                    label: 'Work',
                },
                {
                    country: 'et',
                    phoneNumber: '938 463 3685',
                    label: 'Home',
                },
            ],
            title: 'Electromedical Equipment Technician',
            company: 'Zenolux',
            birthday: '1965-08-02T12:00:00.000Z',
            address: '445 Remsen Avenue, Ruckersville, Delaware, PO2712',
        },
        attachments: _attachments,
    },
    {
        id: '995df091-d78a-4bb7-840c-ba6a7d14a1bd',
        avatar: 'images/avatars/male-11.jpg',
        name: 'Hutchinson Levy',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'hutchinsonlevy@mail.io',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'et',
                    phoneNumber: '970 546 3452',
                    label: 'Mobile',
                },
                {
                    country: 'et',
                    phoneNumber: '894 438 2430',
                    label: 'Work',
                },
            ],
            title: 'Congressional Representative',
            company: 'Zytrek',
            birthday: '1978-03-22T12:00:00.000Z',
            address: '911 Lois Avenue, Epworth, California, PO6557',
        },
        attachments: _attachments,
    },
    {
        id: '7184be71-a28f-4f2b-8c45-15f78cf2f825',
        avatar: 'images/avatars/female-05.jpg',
        name: 'Alissa Nelson',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'alissanelson@mail.us',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'lu',
                    phoneNumber: '893 600 2639',
                    label: 'Mobile',
                },
            ],
            title: 'Bindery Machine Operator',
            company: 'Emtrak',
            birthday: '1993-10-19T12:00:00.000Z',
            address: '514 Sutter Avenue, Shindler, Puerto Rico, PO3862',
        },
        attachments: _attachments,
    },
    {
        id: '325d508c-ca49-42bf-b0d5-c4a6b8da3d5c',
        avatar: null,
        name: 'Oliver Head',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'oliverhead@mail.tv',
                    label: 'Personal',
                },
            ],
            phoneNumbers: [
                {
                    country: 'bn',
                    phoneNumber: '977 528 3294',
                    label: 'Mobile',
                },
            ],
            title: 'Meteorologist',
            company: 'Rameon',
            birthday: '1967-01-05T12:00:00.000Z',
            address: '569 Clermont Avenue, Movico, Marshall Islands, PO7293',
        },
        attachments: _attachments,
    },
    {
        id: 'c674b6e1-b846-4bba-824b-0b4df0cdec48',
        avatar: 'images/avatars/male-13.jpg',
        name: 'Duran Barr',
        about: "Hi there! I'm using FuseChat.",
        details: {
            emails: [
                {
                    email: 'duranbarr@mail.com',
                    label: 'Personal',
                },
                {
                    email: 'barr.duran@hinway.name',
                    label: 'Work',
                },
            ],
            phoneNumbers: [
                {
                    country: 'sr',
                    phoneNumber: '857 457 2508',
                    label: 'Mobile',
                },
                {
                    country: 'sr',
                    phoneNumber: '887 522 2146',
                    label: 'Work',
                },
                {
                    country: 'sr',
                    phoneNumber: '947 574 3174',
                    label: 'Home',
                },
            ],
            title: 'Insurance Analyst',
            company: 'Hinway',
            birthday: '1977-11-06T12:00:00.000Z',
            address: '103 Chestnut Avenue, Glenbrook, Indiana, PO2578',
        },
        attachments: _attachments,
    },
];
export const profile: any = {
    id: 'cfaad35d-07a3-4447-a6c3-d8c3d54fd5df',
    name: 'Brian Hughes',
    email: 'hughes.brian@company.com',
    avatar: 'images/avatars/brian-hughes.jpg',
    about: "Hi there! I'm using FuseChat.",
};
