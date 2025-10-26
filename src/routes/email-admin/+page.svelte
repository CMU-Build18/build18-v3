<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import {
		collection,
		query,
		doc,
		getDoc,
		getDocs,
		where,
		Timestamp
	} from 'firebase/firestore';

	let isAdmin = false;
	let currentUser = null;
	let loading = false;
	let error = null;
	let success = null;

	// Email groups
	let emailGroups = {
		allUsers: { emails: [], loading: false, count: 0 },
		inactiveUsers: { emails: [], loading: false, count: 0 },
		usersWithTeams: { emails: [], loading: false, count: 0 },
		usersWithProjects: { emails: [], loading: false, count: 0 },
		usersWithTeamsAndProjects: { emails: [], loading: false, count: 0 }
	};

	onMount(async () => {
		try {
			// Set up auth listener
			const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
				if (user) {
					currentUser = user;
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						const userData = userDoc.data();
						isAdmin = userData.isAdmin;
						
						if (isAdmin) {
							await loadEmailGroups();
						}
					}
				}
			});

			// Cleanup function
			return () => {
				unsubscribeAuth();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
			error = 'Failed to initialize page';
		}
	});

	async function loadEmailGroups() {
		try {
			await Promise.all([
				loadAllUsers(),
				loadInactiveUsers(),
				loadUsersWithTeams(),
				loadUsersWithProjects(),
				loadUsersWithTeamsAndProjects()
			]);
		} catch (err) {
			console.error('Error loading email groups:', err);
			error = 'Failed to load email groups';
		}
	}

	async function loadAllUsers() {
		emailGroups.allUsers.loading = true;
		try {
			const usersQuery = query(collection(db, 'users'));
			const snapshot = await getDocs(usersQuery);
			const emails = [];
			
			snapshot.forEach((doc) => {
				const userData = doc.data();
				if (userData.email) {
					emails.push(userData.email);
				}
			});
			
			emailGroups.allUsers.emails = emails;
			emailGroups.allUsers.count = emails.length;
		} catch (err) {
			console.error('Error loading all users:', err);
		} finally {
			emailGroups.allUsers.loading = false;
		}
	}

	async function loadInactiveUsers() {
		emailGroups.inactiveUsers.loading = true;
		try {
			const usersQuery = query(collection(db, 'users'));
			const snapshot = await getDocs(usersQuery);
			const emails = [];
			const start2025 = Timestamp.fromDate(new Date('2025-01-01'));
			
			snapshot.forEach((doc) => {
				const userData = doc.data();
				if (userData.email) {
					// Include users without lastDashboardVisit or with visits before 2025
					if (!userData.lastDashboardVisit || userData.lastDashboardVisit < start2025) {
						emails.push(userData.email);
					}
				}
			});
			
			emailGroups.inactiveUsers.emails = emails;
			emailGroups.inactiveUsers.count = emails.length;
		} catch (err) {
			console.error('Error loading inactive users:', err);
		} finally {
			emailGroups.inactiveUsers.loading = false;
		}
	}

	async function loadUsersWithTeams() {
		emailGroups.usersWithTeams.loading = true;
		try {
			const usersQuery = query(collection(db, 'users'), where('teamId', '!=', null));
			const snapshot = await getDocs(usersQuery);
			const emails = [];
			const startAugust2025 = Timestamp.fromDate(new Date('2025-08-01'));
			
			snapshot.forEach((doc) => {
				const userData = doc.data();
				if (userData.email && userData.teamId) {
					// Only include active users (logged in since August 2025)
					if (userData.lastDashboardVisit && userData.lastDashboardVisit >= startAugust2025) {
						emails.push(userData.email);
					}
				}
			});
			
			emailGroups.usersWithTeams.emails = emails;
			emailGroups.usersWithTeams.count = emails.length;
		} catch (err) {
			console.error('Error loading users with teams:', err);
		} finally {
			emailGroups.usersWithTeams.loading = false;
		}
	}

	async function loadUsersWithProjects() {
		emailGroups.usersWithProjects.loading = true;
		try {
			// First get all teams with projectId
			const teamsQuery = query(collection(db, 'teams'), where('projectId', '!=', null));
			const teamsSnapshot = await getDocs(teamsQuery);
			const teamIds = [];
			
			teamsSnapshot.forEach((doc) => {
				const teamData = doc.data();
				if (teamData.projectId) {
					teamIds.push(doc.id);
				}
			});

			// Then get users whose teamId is in the list of teams with projects
			if (teamIds.length > 0) {
				const usersQuery = query(collection(db, 'users'), where('teamId', 'in', teamIds));
				const usersSnapshot = await getDocs(usersQuery);
				const emails = [];
				const startAugust2025 = Timestamp.fromDate(new Date('2025-08-01'));
				
				usersSnapshot.forEach((doc) => {
					const userData = doc.data();
					if (userData.email) {
						// Only include active users (logged in since August 2025)
						if (userData.lastDashboardVisit && userData.lastDashboardVisit >= startAugust2025) {
							emails.push(userData.email);
						}
					}
				});
				
				emailGroups.usersWithProjects.emails = emails;
				emailGroups.usersWithProjects.count = emails.length;
			}
		} catch (err) {
			console.error('Error loading users with projects:', err);
		} finally {
			emailGroups.usersWithProjects.loading = false;
		}
	}

	async function loadUsersWithTeamsAndProjects() {
		emailGroups.usersWithTeamsAndProjects.loading = true;
		try {
			// Get all teams with projectId
			const teamsQuery = query(collection(db, 'teams'), where('projectId', '!=', null));
			const teamsSnapshot = await getDocs(teamsQuery);
			const teamIds = [];
			
			teamsSnapshot.forEach((doc) => {
				const teamData = doc.data();
				if (teamData.projectId) {
					teamIds.push(doc.id);
				}
			});

			// Get users with teamId in teams that have projects
			if (teamIds.length > 0) {
				const usersQuery = query(collection(db, 'users'), where('teamId', 'in', teamIds));
				const usersSnapshot = await getDocs(usersQuery);
				const emails = [];
				const startAugust2025 = Timestamp.fromDate(new Date('2025-08-01'));
				
				usersSnapshot.forEach((doc) => {
					const userData = doc.data();
					if (userData.email && userData.teamId) {
						// Only include active users (logged in since August 2025)
						if (userData.lastDashboardVisit && userData.lastDashboardVisit >= startAugust2025) {
							emails.push(userData.email);
						}
					}
				});
				
				emailGroups.usersWithTeamsAndProjects.emails = emails;
				emailGroups.usersWithTeamsAndProjects.count = emails.length;
			}
		} catch (err) {
			console.error('Error loading users with teams and projects:', err);
		} finally {
			emailGroups.usersWithTeamsAndProjects.loading = false;
		}
	}

	async function copyToClipboard(emails) {
		try {
			const emailString = emails.join(', ');
			await navigator.clipboard.writeText(emailString);
			success = 'Emails copied to clipboard!';
			setTimeout(() => { success = null; }, 3000);
		} catch (err) {
			console.error('Failed to copy emails:', err);
			error = 'Failed to copy emails to clipboard';
			setTimeout(() => { error = null; }, 3000);
		}
	}
</script>

{#if isAdmin}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28">EMAILS</h2>

				<!-- BCC Reminder Banner -->
				<div class="mb-8 p-4 bg-orange-100 border-l-4 border-orange-500 rounded-lg">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-orange-700 font-medium">
								<strong>Important:</strong> When using these email lists, paste them as <strong>BCC</strong> recipients and remember to CC <strong>build18@ece.cmu.edu</strong>
							</p>
						</div>
					</div>
				</div>

				<!-- Status Messages -->
				{#if error}
					<div class="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
						{error}
					</div>
				{/if}
				{#if success}
					<div class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
						{success}
					</div>
				{/if}

				<!-- Email Groups -->
				<div class="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
					<!-- All Users -->
					<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
						<div class="flex justify-between items-center mb-4">
							<h3 class="text-lg font-semibold text-gray-900">All Users</h3>
							<span class="text-sm text-gray-500">
								{emailGroups.allUsers.loading ? 'Loading...' : `${emailGroups.allUsers.count} emails`}
							</span>
						</div>
						<p class="text-sm text-gray-600 mb-4">All registered users in the system</p>
						<button
							class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => copyToClipboard(emailGroups.allUsers.emails)}
							disabled={emailGroups.allUsers.loading || emailGroups.allUsers.emails.length === 0}
						>
							Copy All User Emails
						</button>
					</div>

					<!-- Inactive Users -->
					<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
						<div class="flex justify-between items-center mb-4">
							<h3 class="text-lg font-semibold text-gray-900">Inactive Users</h3>
							<span class="text-sm text-gray-500">
								{emailGroups.inactiveUsers.loading ? 'Loading...' : `${emailGroups.inactiveUsers.count} emails`}
							</span>
						</div>
						<p class="text-sm text-gray-600 mb-4">Users without dashboard visits in 2025</p>
						<button
							class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => copyToClipboard(emailGroups.inactiveUsers.emails)}
							disabled={emailGroups.inactiveUsers.loading || emailGroups.inactiveUsers.emails.length === 0}
						>
							Copy Inactive User Emails
						</button>
					</div>

					<!-- Users with Teams -->
					<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
						<div class="flex justify-between items-center mb-4">
							<h3 class="text-lg font-semibold text-gray-900">Active Users with Teams</h3>
							<span class="text-sm text-gray-500">
								{emailGroups.usersWithTeams.loading ? 'Loading...' : `${emailGroups.usersWithTeams.count} emails`}
							</span>
						</div>
						<p class="text-sm text-gray-600 mb-4">Active users (logged in since Aug 2025) who are members of a team</p>
						<button
							class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => copyToClipboard(emailGroups.usersWithTeams.emails)}
							disabled={emailGroups.usersWithTeams.loading || emailGroups.usersWithTeams.emails.length === 0}
						>
							Copy Team Member Emails
						</button>
					</div>

					<!-- Users with Projects -->
					<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
						<div class="flex justify-between items-center mb-4">
							<h3 class="text-lg font-semibold text-gray-900">Active Users with Projects</h3>
							<span class="text-sm text-gray-500">
								{emailGroups.usersWithProjects.loading ? 'Loading...' : `${emailGroups.usersWithProjects.count} emails`}
							</span>
						</div>
						<p class="text-sm text-gray-600 mb-4">Active users (logged in since Aug 2025) whose teams have submitted projects</p>
						<button
							class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => copyToClipboard(emailGroups.usersWithProjects.emails)}
							disabled={emailGroups.usersWithProjects.loading || emailGroups.usersWithProjects.emails.length === 0}
						>
							Copy Project Participant Emails
						</button>
					</div>

					<!-- Users with Teams and Projects -->
					<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:col-span-1 lg:col-span-2">
						<div class="flex justify-between items-center mb-4">
							<h3 class="text-lg font-semibold text-gray-900">Active Users with Teams and Projects</h3>
							<span class="text-sm text-gray-500">
								{emailGroups.usersWithTeamsAndProjects.loading ? 'Loading...' : `${emailGroups.usersWithTeamsAndProjects.count} emails`}
							</span>
						</div>
						<p class="text-sm text-gray-600 mb-4">Active users (logged in since Aug 2025) who are on teams that have submitted projects</p>
						<button
							class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => copyToClipboard(emailGroups.usersWithTeamsAndProjects.emails)}
							disabled={emailGroups.usersWithTeamsAndProjects.loading || emailGroups.usersWithTeamsAndProjects.emails.length === 0}
						>
							Copy Active Team Member Emails
						</button>
					</div>
				</div>

				<!-- Refresh Button -->
				<div class="mt-8 text-center">
					<button
						class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
						onclick={loadEmailGroups}
					>
						Refresh All Email Lists
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-orange-500 pt-28">ADMIN DASHBOARD</h2>
				<p class="text-gray-700 mb-4">Please login as admin or return to home.</p>
				<button
					class="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
					onclick={() => (window.location.href = '/')}
				>
					Return Home
				</button>
			</div>
		</div>
	</div>
{/if}



<style>
	:global(body) {
		background-color: #fff;
	}

	.bg-custom {
		background-image: url('/background.svg');
		background-repeat: repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
