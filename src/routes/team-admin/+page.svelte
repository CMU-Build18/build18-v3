<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import {
		collection,
		query,
		doc,
		getDoc,
		getDocs,
		updateDoc,
		where,
		arrayUnion,
		arrayRemove
	} from 'firebase/firestore';
	import { Search, X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let currentUser;
	let isAdmin = false;
	let isLoading = false;

	// Main data
	let users = [];
	let teams = [];

	// Search and editing
	let searchQuery = '';
	let emailSearch = '';
	let teamSearch = '';
	let selectedTeam = null;
	let editingTeam = null;
	let isEditMode = false;
	let isSearching = false;
	let isSearchingTeams = false;

	// User editing
	let selectedUser = null;
	let editingUser = null;
	let userSearchResults = [];
	let teamSearchResults = [];

	// Alerts
	let alertMessage = '';
	let alertType = '';

	// Two-column workflow state
	let step1Complete = false; // User selected and removed from current team
	let step2InProgress = false; // Ready to add to new team

	// Statistics
	let totalUsers = 0;
	let totalTeams = 0;
	let usersWithTeams = 0;
	let usersWithoutTeams = 0;

	// Reactive statements for statistics

	$: {
		totalUsers = users.length;
		totalTeams = teams.length;
		usersWithTeams = users.filter((user) => user.teamId).length;
		usersWithoutTeams = users.filter((user) => !user.teamId).length;
	}

	// Utility functions
	function showAlert(message, type) {
		alertMessage = message;
		alertType = type;
		setTimeout(() => {
			alertMessage = '';
			alertType = '';
		}, 5000);
	}

	function getTeamMembers(teamId) {
		const team = teams.find((t) => t.id === teamId);
		if (!team || !team.members) return [];

		return team.members.map((memberId) => {
			const user = users.find((u) => u.id === memberId);
			return (
				user || { id: memberId, firstName: 'Unknown', lastName: 'User', email: 'unknown@email.com' }
			);
		});
	}

	async function searchUserByEmail() {
		if (!emailSearch.trim()) {
			userSearchResults = [];
			return;
		}

		isSearching = true;
		try {
			// Search in current users array first
			const localResults = users.filter(
				(user) =>
					user.email?.toLowerCase().includes(emailSearch.toLowerCase()) ||
					user.firstName?.toLowerCase().includes(emailSearch.toLowerCase()) ||
					user.lastName?.toLowerCase().includes(emailSearch.toLowerCase()) ||
					user.andrewId?.toLowerCase().includes(emailSearch.toLowerCase())
			);

			// If no local results, search database directly
			if (localResults.length === 0) {
				const usersQuery = query(
					collection(db, 'users'),
					where('email', '>=', emailSearch.toLowerCase()),
					where('email', '<=', emailSearch.toLowerCase() + '\uf8ff')
				);
				const querySnapshot = await getDocs(usersQuery);

				const dbResults = [];
				querySnapshot.forEach((doc) => {
					const userData = { id: doc.id, ...doc.data() };
					if (!users.find((u) => u.id === userData.id)) {
						dbResults.push(userData);
					}
				});

				userSearchResults = [...localResults, ...dbResults];
			} else {
				userSearchResults = localResults;
			}
		} catch (error) {
			console.error('Error searching users:', error);
			showAlert('Error searching for users', 'error');
		} finally {
			isSearching = false;
		}
	}

	async function searchTeams() {
		if (!teamSearch.trim()) {
			teamSearchResults = [];
			return;
		}

		isSearchingTeams = true;
		try {
			// Search in 2026 teams only
			teamSearchResults = teams.filter(
				(team) =>
					team.name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
					team.id?.toLowerCase().includes(teamSearch.toLowerCase())
			);
		} catch (error) {
			console.error('Error searching teams:', error);
			showAlert('Error searching for teams', 'error');
		} finally {
			isSearchingTeams = false;
		}
	}

	async function loadData() {
		isLoading = true;
		try {
			// Load users and all teams, then filter for 2026 in JavaScript
			const [usersSnapshot, teamsSnapshot] = await Promise.all([
				getDocs(query(collection(db, 'users'))),
				getDocs(query(collection(db, 'teams')))
			]);

			users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
			// Filter teams to 2026 only (includes teams with year='2026' or no year field for current competition)
			const allTeams = teamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
			teams = allTeams.filter((team) => team.year === 2026 || !team.year);

			console.log(
				`Loaded ${users.length} users and ${teams.length} teams (2026 only, filtered from ${allTeams.length} total)`
			);
		} catch (error) {
			console.error('Error loading data:', error);
			showAlert('Error loading data', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function safeRemoveUserFromCurrentTeam(userId) {
		if (!userId) return false;

		isLoading = true;
		try {
			const user = users.find((u) => u.id === userId);
			if (!user) {
				showAlert('User not found', 'error');
				return false;
			}

			// If user has a team, remove them from it
			if (user.teamId) {
				const currentTeam = teams.find((t) => t.id === user.teamId);

				// Update team members array
				await updateDoc(doc(db, 'teams', user.teamId), {
					members: arrayRemove(userId)
				});

				// Add current team to user's past teams if not already there
				const pastTeams = user.pastTeams || [];
				if (!pastTeams.includes(user.teamId)) {
					pastTeams.push(user.teamId);
				}

				// Remove user's current teamId and update past teams
				await updateDoc(doc(db, 'users', userId), {
					teamId: null,
					pastTeams: pastTeams
				});

				// Update local data
				const teamIndex = teams.findIndex((t) => t.id === user.teamId);
				if (teamIndex !== -1 && teams[teamIndex].members) {
					teams[teamIndex].members = teams[teamIndex].members.filter((id) => id !== userId);
				}

				const userIndex = users.findIndex((u) => u.id === userId);
				if (userIndex !== -1) {
					users[userIndex].teamId = null;
					users[userIndex].pastTeams = pastTeams;
				}

				// Trigger reactivity
				teams = [...teams];
				users = [...users];

				showAlert(
					`User removed from team "${currentTeam?.name || 'Unknown'}" successfully`,
					'success'
				);
			}

			return true;
		} catch (error) {
			console.error('Error removing user from team:', error);
			showAlert('Error removing user from current team', 'error');
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function safeAddUserToTeam(userId, teamId) {
		if (!userId || !teamId) return false;

		isLoading = true;
		try {
			const user = users.find((u) => u.id === userId);
			const team = teams.find((t) => t.id === teamId);

			if (!user || !team) {
				showAlert('User or team not found', 'error');
				return false;
			}

			// Check if user already has a team
			if (user.teamId) {
				showAlert('User still has a team. Please remove them from current team first.', 'error');
				return false;
			}

			// Update team members array (use Set to ensure uniqueness)
			const currentMembers = team.members || [];
			const uniqueMembers = [...new Set([...currentMembers, userId])];

			await updateDoc(doc(db, 'teams', teamId), {
				members: uniqueMembers
			});

			// Update user's teamId
			await updateDoc(doc(db, 'users', userId), {
				teamId: teamId
			});

			// Update local data
			const teamIndex = teams.findIndex((t) => t.id === teamId);
			if (teamIndex !== -1) {
				teams[teamIndex].members = uniqueMembers;
			}

			const userIndex = users.findIndex((u) => u.id === userId);
			if (userIndex !== -1) {
				users[userIndex].teamId = teamId;
			}

			// Trigger reactivity
			teams = [...teams];
			users = [...users];

			// Reset workflow state
			step1Complete = false;
			step2InProgress = false;
			selectedUser = null;
			userSearchResults = [];
			teamSearchResults = [];
			emailSearch = '';
			teamSearch = '';

			showAlert(`User added to team "${team.name}" successfully`, 'success');
			return true;
		} catch (error) {
			console.error('Error adding user to team:', error);
			showAlert('Error adding user to team', 'error');
			return false;
		} finally {
			isLoading = false;
		}
	}

	// Workflow functions for safe two-step process
	async function selectUserAndRemoveFromTeam(user) {
		const success = await safeRemoveUserFromCurrentTeam(user.id);
		if (success) {
			selectedUser = user;
			step1Complete = true;
			step2InProgress = true;
		}
	}

	function resetWorkflow() {
		step1Complete = false;
		step2InProgress = false;
		selectedUser = null;
		userSearchResults = [];
		teamSearchResults = [];
		emailSearch = '';
		teamSearch = '';
	}

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
							await loadData();
						}
					}
				} else {
					isAdmin = false;
				}
			});

			// Cleanup function
			return () => {
				unsubscribeAuth();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
		}
	});
</script>

{#if isAdmin}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10">
			<div class="p-4 max-w-7xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28">TEAM ADMIN</h2>

				<!-- Alert Messages -->
				{#if alertMessage}
					<div
						class="mb-4 p-4 rounded-lg {alertType === 'success'
							? 'bg-green-100 text-green-700 border border-green-300'
							: 'bg-red-100 text-red-700 border border-red-300'}"
						transition:fade
					>
						{alertMessage}
					</div>
				{/if}

				<div class="bg-white rounded-lg shadow-lg p-6 mb-8">
					<div class="mb-6">
						{#if step1Complete}
							<div
								class="mt-2 p-2 bg-green-100 border border-green-300 rounded text-green-700 text-sm"
							>
								✓ Step 1 Complete: User {selectedUser.firstName}
								{selectedUser.lastName} has been removed from their previous team
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Step 1: User Search and Removal -->
						<div
							class="border rounded-lg p-4 {step1Complete
								? 'bg-green-50 border-green-300'
								: 'bg-gray-50'}"
						>
							<h4 class="font-semibold text-gray-800 mb-4">
								Step 1: Select User to Move
								{#if step1Complete}
									<span class="ml-2 text-green-600">✓ Complete</span>
								{/if}
							</h4>

							{#if !step1Complete}
								<div class="flex gap-2 mb-4">
									<div class="flex-1 relative">
										<Search
											class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
										/>
										<input
											type="text"
											bind:value={emailSearch}
											on:input={searchUserByEmail}
											placeholder="Search by email, name, or Andrew ID..."
											class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
										/>
									</div>
								</div>

								{#if isSearching}
									<div class="flex items-center justify-center py-4">
										<div
											class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"
										></div>
									</div>
								{:else if userSearchResults.length > 0}
									<div class="space-y-2 max-h-64 overflow-y-auto">
										{#each userSearchResults as user}
											<div
												class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
											>
												<div class="flex-1">
													<div class="font-medium text-gray-900">
														{user.firstName}
														{user.lastName}
													</div>
													<div class="text-sm text-gray-600">{user.email}</div>
													<div class="text-xs text-gray-500">
														Andrew ID: {user.andrewId || 'N/A'}
														{#if user.teamId}
															| Current Team: {teams.find((t) => t.id === user.teamId)?.name ||
																'Unknown'}
														{:else}
															| No current team
														{/if}
													</div>
												</div>
												<button
													on:click={() => selectUserAndRemoveFromTeam(user)}
													class="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
													disabled={isLoading}
												>
													{user.teamId ? 'Remove & Select' : 'Select'}
												</button>
											</div>
										{/each}
									</div>
								{/if}
							{:else}
								<div class="p-4 bg-green-100 border border-green-300 rounded-lg">
									<div class="font-medium text-green-800">
										Selected User: {selectedUser.firstName}
										{selectedUser.lastName}
									</div>
									<div class="text-sm text-green-600">{selectedUser.email}</div>
									<button
										on:click={resetWorkflow}
										class="mt-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
									>
										Start Over
									</button>
								</div>
							{/if}
						</div>

						<!-- Step 2: Team Search and Addition -->
						<div
							class="border rounded-lg p-4 {step2InProgress
								? 'bg-blue-50 border-blue-300'
								: 'bg-gray-100'}"
						>
							<h4 class="font-semibold text-gray-800 mb-4">
								Step 2: Select Team to Add User To
							</h4>

							{#if step2InProgress}
								<div class="flex gap-2 mb-4">
									<div class="flex-1 relative">
										<Search
											class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
										/>
										<input
											type="text"
											bind:value={teamSearch}
											on:input={searchTeams}
											placeholder="Search 2026 teams by name or ID..."
											class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
								</div>

								{#if isSearchingTeams}
									<div class="flex items-center justify-center py-4">
										<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
									</div>
								{:else if teamSearchResults.length > 0}
									<div class="space-y-2 max-h-64 overflow-y-auto">
										{#each teamSearchResults as team}
											<div
												class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
											>
												<div class="flex-1">
													<div class="font-medium text-gray-900">{team.name}</div>
													<div class="text-sm text-gray-600">Team ID: {team.id}</div>
													<div class="text-xs text-gray-500">
														Members: {team.members?.length || 0}
														{#if team.year}| Year: {team.year}{/if}
													</div>
												</div>
												<button
													on:click={() => safeAddUserToTeam(selectedUser.id, team.id)}
													class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
													disabled={isLoading}
												>
													Add User
												</button>
											</div>
										{/each}
									</div>
								{:else if teamSearch.trim()}
									<div class="text-center py-4 text-gray-500">
										No 2026 teams found matching "{teamSearch}"
									</div>
								{/if}
							{:else}
								<div class="text-center py-8 text-gray-400">
									Waiting on user selection...
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- 2026 Teams List -->
				<div class="bg-white rounded-lg shadow-lg overflow-hidden">
					<div class="px-6 py-4 border-b border-gray-200">
						<h3 class="text-xl font-bold text-orange-600">2026 Teams ({teams.length})</h3>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Team Name
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										ID
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Members
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Year
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Created
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each teams as team}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="text-sm font-medium text-gray-900">{team.name}</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-500 font-mono">{team.id}</div>
										</td>
										<td class="px-6 py-4">
											<div class="text-sm text-gray-900">
												{#each getTeamMembers(team.id) as member}
													<div class="py-1 px-2 bg-gray-50 rounded mb-1">
														<span class="text-xs">
															{member.firstName}
															{member.lastName}
														</span>
														<span class="text-xs text-gray-500">({member.email})</span>
													</div>
												{:else}
													<span class="text-gray-400 italic">No members</span>
												{/each}
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
											>
												{team.year || '2026'}
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{team.createdAt
												? new Date(team.createdAt.seconds * 1000).toLocaleDateString()
												: 'N/A'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10">
			<div class="p-4 max-w-6xl mx-auto text-center">
				<h2 class="text-5xl font-extrabold mb-8 text-orange-500 pt-28">TEAM ADMIN</h2>

				{#if isLoading}
					<div class="flex flex-col items-center justify-center py-12">
						<div
							class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"
						></div>
						<p class="text-gray-600">Loading admin dashboard...</p>
					</div>
				{:else}
					<div
						class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
						role="alert"
					>
						<strong class="font-bold">Access Denied!</strong>
						<span class="block sm:inline"> You must be an admin to access this page.</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Loading Overlay -->
{#if isLoading}
	<div
		class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
		transition:fade
	>
		<div class="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
			<div
				class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"
			></div>
			<p class="text-gray-700 font-medium">Processing...</p>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #fff;
	}

	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
