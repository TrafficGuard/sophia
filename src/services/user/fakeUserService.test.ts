import * as path from 'path';
import { expect } from 'chai';
import * as fs from 'fs/promises';
import { User } from '#model/user';
import { FakeUserService } from '#services/user/fakeUserService'; // Path to your cacheService file
import { UserService } from './userService';

describe('FakeUserService', () => {
	const fakeUserService = new FakeUserService();

	function createUserWithDefaults(overrides: Partial<User>): User {
		const defaultUser: User = {
			id: '',
			email: '',
			enabled: true,
			hilBudget: 0,
			hilCount: 0,
			llmConfig: {
				anthropicKey: '',
				openaiKey: '',
				groqKey: '',
				togetheraiKey: '',
			},
			gitlabConfig: {
				host: '',
				token: '',
				topLevelGroups: [],
			},
			githubConfig: {
				token: '',
			},
			jiraConfig: {
				baseUrl: '',
				email: '',
				token: '',
			},
			perplexityKey: '',
		};
		return { ...defaultUser, ...overrides };
	}

	beforeEach(() => {
		// Reset the state before each test
		fakeUserService.users = [];
	});

	describe('getUser', () => {
		it('should retrieve a user by ID', async () => {
			const user = createUserWithDefaults({
				id: '1',
				email: 'test@example.com',
				hilBudget: 100,
			});
			await fakeUserService.createUser(user);
			const retrievedUser = await fakeUserService.getUser('1');
			expect(retrievedUser).to.deep.equal(user);
		});

		// ... other tests ...
	});

	// ... other describe blocks ...

		it('should throw an error if user is not found', (done) => {
			fakeUserService.getUser('nonexistent').catch((err) => {
				expect(err).to.be.an('error');
				done();
			});
		});
	});

	describe('updateUser', () => {
		it('should update user details', async () => {
			const user: User = {
				id: '2',
				email: 'update@example.com',
				enabled: true,
				hilBudget: 100,
				hilCount: 0,
				llmConfig: {
					anthropicKey: '',
					openaiKey: '',
					groqKey: '',
					togetheraiKey: '',
				},
				gitlabConfig: {
					host: '',
					token: '',
					topLevelGroups: [],
				},
				githubConfig: {
					token: '',
				},
				jiraConfig: {
					baseUrl: '',
					email: '',
					token: '',
				},
				perplexityKey: '',
			};
			await fakeUserService.createUser(user);
			await fakeUserService.updateUser('2', { email: 'updated@example.com' });
			const updatedUser = await fakeUserService.getUser('2');
			expect(updatedUser.email).to.equal('updated@example.com');
		});
	});

	describe('disableUser', () => {
		it('should disable a user', async () => {
			const user: User = {
				id: '3',
				email: 'disable@example.com',
				enabled: true,
				hilBudget: 100,
				hilCount: 0,
				llmConfig: {
					anthropicKey: '',
					openaiKey: '',
					groqKey: '',
					togetheraiKey: '',
				},
				gitlabConfig: {
					host: '',
					token: '',
					topLevelGroups: [],
				},
				githubConfig: {
					token: '',
				},
				jiraConfig: {
					baseUrl: '',
					email: '',
					token: '',
				},
				perplexityKey: '',
			};
			await fakeUserService.createUser(user);
			await fakeUserService.disableUser('3');
			const disabledUser = await fakeUserService.getUser('3');
			expect(disabledUser.enabled).to.be.false;
		});
	});

	describe('listUsers', () => {
		it('should list all users', async () => {
			const user1: User = {
				id: '4',
				email: 'list1@example.com',
				enabled: true,
				hilBudget: 100,
				hilCount: 0,
				llmConfig: {
					anthropicKey: '',
					openaiKey: '',
					groqKey: '',
					togetheraiKey: '',
				},
				gitlabConfig: {
					host: '',
					token: '',
					topLevelGroups: [],
				},
				githubConfig: {
					token: '',
				},
				jiraConfig: {
					baseUrl: '',
					email: '',
					token: '',
				},
				perplexityKey: '',
			};
			const user2: User = {
				id: '5',
				email: 'list2@example.com',
				enabled: true,
				hilBudget: 100,
				hilCount: 0,
				llmConfig: {
					anthropicKey: '',
					openaiKey: '',
					groqKey: '',
					togetheraiKey: '',
				},
				gitlabConfig: {
					host: '',
					token: '',
					topLevelGroups: [],
				},
				githubConfig: {
					token: '',
				},
				jiraConfig: {
					baseUrl: '',
					email: '',
					token: '',
				},
				perplexityKey: '',
			};
			await fakeUserService.createUser(user1);
			await fakeUserService.createUser(user2);
			const users = await fakeUserService.listUsers();
			expect(users).to.have.lengthOf(2);
			expect(users).to.deep.include.members([user1, user2]);
		});
	});

	describe('updateUser error cases', () => {
		it('should throw an error if user does not exist', (done) => {
			fakeUserService.updateUser('nonexistent', { email: 'noone@example.com' }).catch((err) => {
				expect(err).to.be.an('error');
				done();
			});
		});
	});

	describe('disableUser error cases', () => {
		it('should throw an error if user does not exist', (done) => {
			fakeUserService.disableUser('nonexistent').catch((err) => {
				expect(err).to.be.an('error');
				done();
			});
		});
	});

	describe('createUser', () => {
		it('should create a new user', async () => {
			const newUser = createUserWithDefaults({
				id: '6',
				email: 'create@example.com',
			});
			const createdUser = await fakeUserService.createUser(newUser);
			expect(createdUser).to.include(newUser);
			const retrievedUser = await fakeUserService.getUser('6');
			expect(retrievedUser).to.include(newUser);
		});
	});
});
