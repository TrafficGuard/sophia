import { assert, expect } from 'chai';
import { resetFirestoreEmulator } from '#firestore/resetFirestoreEmulator';
import { User } from '#user/user';
import { FirestoreUserService } from './firestoreUserService';

describe('FirestoreUserService', () => {
	let firestoreUserService: FirestoreUserService;

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
			functionConfig: {},
			// gitlabConfig: {
			// 	host: '',
			// 	token: '',
			// 	topLevelGroups: [],
			// },
			// githubConfig: {
			// 	token: '',
			// },
			// jiraConfig: {
			// 	baseUrl: '',
			// 	email: '',
			// 	token: '',
			// },
			// perplexityKey: '',
		};
		return { ...defaultUser, ...overrides };
	}

	beforeEach(async () => {
		firestoreUserService = new FirestoreUserService();
		await resetFirestoreEmulator();
	});

	describe('getUser', () => {
		it('should retrieve a user by ID', async () => {
			let user = createUserWithDefaults({
				email: 'test@example.com',
				hilBudget: 100,
			});
			user = await firestoreUserService.createUser(user);
			const retrievedUser = await firestoreUserService.getUser(user.id);
			expect(retrievedUser).to.deep.equal(user);
		});

		it('should throw an error if user is not found', async () => {
			try {
				await firestoreUserService.getUser('nonexistent');
				assert.fail('Should throw an Error if user is not found');
			} catch (e) {}
		});
	});

	describe('updateUser', () => {
		it('should update user details', async () => {
			const createUser: Partial<User> = createUserWithDefaults({
				email: 'original@example.com',
			});
			const user = await firestoreUserService.createUser(createUser);
			await firestoreUserService.updateUser({ email: 'updated@example.com' }, user.id);
			const updatedUser = await firestoreUserService.getUser(user.id);
			expect(updatedUser.email).to.equal('updated@example.com');
		});
	});

	describe('disableUser', () => {
		it('should disable a user', async () => {
			let user: Partial<User> = createUserWithDefaults({
				email: 'original@example.com',
				enabled: true,
			});
			user = await firestoreUserService.createUser(user);
			await firestoreUserService.disableUser(user.id);
			const disabledUser = await firestoreUserService.getUser(user.id);
			expect(disabledUser.enabled).to.be.false;
		});
	});

	describe('listUsers', () => {
		it('should list all users', async () => {
			let user1: Partial<User> = createUserWithDefaults({
				email: 'list1@example.com',
			});
			let user2: Partial<User> = createUserWithDefaults({
				email: 'list2@example.com',
			});
			user1 = await firestoreUserService.createUser(user1);
			user2 = await firestoreUserService.createUser(user2);
			const users = await firestoreUserService.listUsers();
			expect(users).to.have.lengthOf(2);
			expect(users).to.deep.include.members([user1, user2]);
		});
	});

	describe('createUser', () => {
		it('should create a new user', async () => {
			const newUser = createUserWithDefaults({
				email: 'create@example.com',
			});
			const createdUser = await firestoreUserService.createUser(newUser);
			expect(createdUser.email).to.equal(newUser.email);
			const retrievedUser = await firestoreUserService.getUser(createdUser.id);
			expect(retrievedUser.email).to.equal(newUser.email);
		});
	});
});
