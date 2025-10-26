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
		arrayUnion,
		Timestamp,
		onSnapshot
	} from 'firebase/firestore';
	import {
		getStorage,
		ref,
		getBytes,
		uploadBytes,
		getDownloadURL,
		list,
		listAll
	} from 'firebase/storage';
	import { ThumbsUp, ThumbsDown, AlertTriangle, MessageSquare, Copy, Check } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { get } from 'svelte/store';

	// import { downloadTeamContracts } from '../../lib/firebase';
	// downloadTeamContracts();

	let users = [];
	let teams = [];
	let drafts = [];
	let currentDraftIndex = 0;
	let feedback = '';
	let isSubmitting = false;
	let currentUser;
	let isAdmin = false;
	let isLoading = false;

	// Review stats
	let newSubmissions = 0;
	let inReviewSubmissions = 0;
	let reviewedSubmissions = 0;
	let incompleteSubmissions = 0;

	let track1 = 0;
	let track2 = 0;
	let innov18 = 0;
	let innov18Teams = 0;

	let teamDrafts = [];

	let incompleteStack = [];
	let reviewedStack = [];
	let track1Drafts = [];
	let track2Drafts = [];
	let innov18Drafts = [];
	let unsortedDrafts = [];

	let contractURLs = new Set();

	let expandedCardId = null;

	let signedCount = 0;
	let teamsWithTwoOrMoreMembers = 0;
	let copied;

	// Add reactive statement for drafts
	$: currentDraft = drafts[currentDraftIndex] || null;

	// Fisher-Yates shuffle algorithm
	function shuffleArray(array) {
		let currentIndex = array.length;
		let temporaryValue, randomIndex;

		while (currentIndex !== 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	function updateStats() {
		newSubmissions = drafts.filter((d) => !d.reviewers || d.reviewers.length === 0).length;
		inReviewSubmissions = drafts.filter((d) => d.reviewers?.length > 0 && !d.status).length;
		reviewedSubmissions = drafts.filter(
			(d) => d.status === 'approved' || d.status === 'disapproved'
		).length;
		incompleteSubmissions = drafts.filter((d) => d.status === 'incomplete').length;
	}

	let copiedEmail = null;

	async function copyEmailToClipboard(email) {
		try {
			await navigator.clipboard.writeText(email);
			copiedEmail = email;
			setTimeout(() => {
				copiedEmail = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy email:', err);
		}
	}

	async function copyAllEmailsToClipboard(emails) {
		const emailList = emails.map((member) => member.email).join(', ');
		try {
			await navigator.clipboard.writeText(emailList);
		} catch (err) {
			console.error('Failed to copy emails:', err);
		}
	}

	function hasSignedContract(teamId) {
		const team = teams.find((t) => t.id === teamId);
		if (!team) return false;

		// Check if any team member has signed a contract
		return team.members && team.members.some(memberId => {
			const user = allUsers.find(u => u.id === memberId);
			return user && user.contractURL;
		});
	}

	function hasReimbursements(draft) {
		return draft.partsAndCosts && draft.partsAndCosts.some((item) => item.reimbursement === true);
	}

	function getContractURL(teamId) {
		const team = teams.find((t) => t.id === teamId);
		if (!team) return '';

		// Find the first team member with a contract
		for (const memberId of team.members || []) {
			const user = allUsers.find(u => u.id === memberId);
			if (user && user.contractURL) {
				return user.contractURL;
			}
		}
		
		return '';
	}

	// Add variable to store all users for team member lookups
	let allUsers = [];

	function getTeamMembers(teamId) {
		const team = teams.find((t) => t.id === teamId);
		if (!team) return [];

		return team.members.map((memberId) => {
			const user = allUsers.find((u) => u.id === memberId);
			return user ? user : { email: 'Unknown user' };
		});
	}

	// Function to get team name
	function getTeamName(teamId) {
		const team = teams.find((t) => t.id === teamId);
		if (!team) return [];

		return team.name;
	}

	onMount(async () => {
		try {
			// Set up real-time listener for 2026 drafts
			const draftsQuery = query(collection(db, '2026-drafts'));
			const unsubscribeDrafts = onSnapshot(draftsQuery, (snapshot) => {
				// Get drafts and shuffle them
				const newDrafts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
				drafts = shuffleArray(newDrafts);
				updateStats();
			});

			// Load users and teams
			const [usersSnapshot, teamsSnapshot] = await Promise.all([
				getDocs(query(collection(db, 'users'))),
				getDocs(query(collection(db, 'teams')))
			]);

			// Store all users globally for team member lookups
			allUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
			
			// Filter users to only include those who visited dashboard after August 2025
			users = allUsers.filter((user) => {
				if (!user.lastDashboardVisit) return false;
				const lastDashboardVisitDate = user.lastDashboardVisit.toDate ? user.lastDashboardVisit.toDate() : new Date(user.lastDashboardVisit);
				const aug2025 = new Date('2025-08-01');
				return lastDashboardVisitDate > aug2025;
			});
			
			// Filter teams to only include 2026 teams
			teams = teamsSnapshot.docs
				.map((doc) => ({ id: doc.id, ...doc.data() }))
				.filter((team) => team.year === 2026);

			// Count teams with 2 or more members
			teamsWithTwoOrMoreMembers = teams.filter(team => 
				team.members && team.members.length >= 2
			).length;

			// Count contracts - users with contractURL that belong to 2026 teams
			const team2026MemberIds = new Set();
			teams.forEach((team) => {
				if (team.members) {
					team.members.forEach(memberId => team2026MemberIds.add(memberId));
				}
			});

			signedCount = allUsers.filter(user => 
				user.contractURL && team2026MemberIds.has(user.id)
			).length;

			// Categorize drafts based on their boolean flags
			drafts.forEach((draft) => {
				// Use null-safe boolean checks
				if (draft.innov18 === true) {
					innov18Drafts.push(draft);
				}
				if (draft.track1 === true) {
					track1Drafts.push(draft);
				}
				if (draft.track2 === true) {
					track2Drafts.push(draft);
				}
				// Check for unsorted drafts (no track assigned)
				if (draft.innov18 !== true && draft.track1 !== true && draft.track2 !== true) {
					unsortedDrafts.push(draft);
				}
			});

			// Remove duplicates and update counts
			innov18Drafts = [...new Set(innov18Drafts)];
			track1Drafts = [...new Set(track1Drafts)];
			track2Drafts = [...new Set(track2Drafts)];
			unsortedDrafts = [...new Set(unsortedDrafts)];

			// Update counts based on the boolean flags in drafts
			innov18Teams = innov18Drafts.length;
			track1 = track1Drafts.length;
			track2 = track2Drafts.length;

			// Process draft status for review stats
			drafts.forEach((draft) => {
				if (!draft.status) {
					incompleteStack.push(draft);
				} else {
					reviewedStack.push(draft);
				}
			});

			// Set up auth listener
			const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
				if (user) {
					currentUser = user;
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						const userData = userDoc.data();
						isAdmin = userData.isAdmin;
					}
				}
			});

			// Cleanup function
			return () => {
				unsubscribeDrafts();
				unsubscribeAuth();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
		}
	});

	async function downloadContracts() {
		console.log('Downloading contracts');
		const url = '/contracts.zip';
		const link = document.createElement('a');
		link.href = url;
		link.download = 'contracts.zip';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

{#if isAdmin}
	<div class="bg-white bg-custom">
		<div class="relative z-100">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					TRACK REVIEW
				</h2>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Builders</span>
							<span class="block text-3xl font-bold text-orange-500">{users.length}</span>
						</div>
					</div>
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Teams</span>
							<span class="block text-3xl font-bold text-orange-500">{teams.length}</span>
						</div>
					</div>
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Contracts</span>
							<span class="block text-3xl font-bold text-orange-500">{teamsWithTwoOrMoreMembers} | {signedCount}</span>
						</div>
					</div>
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Track 1</span>
							<span class="block text-3xl font-bold text-orange-500">{track1}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Track 2</span>
							<span class="block text-3xl font-bold text-orange-500">{track2}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Innov18</span>
							<span class="block text-3xl font-bold text-orange-500">{innov18Teams}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Unsorted</span>
							<span class="block text-3xl font-bold text-orange-500">{unsortedDrafts.length}</span>
						</div>
					</div>
				</div>
				<!-- <button class="w-full text-white font-semibold" on:click={downloadContracts}>
					<div
						class="bg-orange-500 text-white border-2 border-orange-500 rounded-lg shadow p-4 text-center"
					>
						DOWNLOAD CONTRACTS
					</div>
				</button> -->

				<!-- Innov18 Projects -->
				<div class="mb-12">
					<h3 class="text-3xl font-extrabold mb-8 text-center text-orange-500 pt-6 mx-auto">
						INNOV18
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
						{#each innov18Drafts as draft}
							<div
								class="bg-white rounded-lg relative {hasReimbursements(draft)
									? 'border-4 border-blue-500'
									: ''}"
							>
								<div
									class="bg-white rounded-lg shadow-lg p-6 relative {hasSignedContract(draft.teamId)
										? 'border-4 border-green-500'
										: ''}"
								>
									<!-- Main content always visible -->
									<div class="space-y-4">
										<div class="flex justify-between items-start">
											<h4 class="text-xl font-bold text-gray-800 truncate pr-8">{draft.title}</h4>
											<!-- View Details trigger button -->
											<button
												class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
												on:click={() =>
													(expandedCardId = expandedCardId === draft.teamId ? null : draft.teamId)}
												aria-label="Toggle project details"
												aria-expanded={expandedCardId === draft.teamId}
											>
												<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													/>
												</svg>
											</button>
										</div>

										<p class="text-gray-600 line-clamp-3">{draft.detail}</p>

										<div class="border-t pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team:</h5>
											<div class="truncate">
												<span class="text-gray-600">
													{getTeamName(draft.teamId)}
												</span>
											</div>
										</div>

										<!-- List of member emails -->
										<div class="pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team Members:</h5>
											<div class="space-y-2">
												{#each getTeamMembers(draft.teamId) as member}
													<div class="flex items center group">
														<span class="text-gray-600 truncate">{member.email}</span>
														<button
															class="p-1 hover:bg-gray-100 rounded-full transition-colors"
															on:click={() => copyEmailToClipboard(member.email)}
														>
															{#if copiedEmail === member.email}
																<Check class="w-4 h-4 text-green-500" />
															{:else}
																<Copy class="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
															{/if}
														</button>
													</div>
												{/each}
											</div>
										</div>

										<div>
											<h5 class="font-semibold text-gray-700">Total Cost:</h5>
											<span class="text-gray-800">
												${(draft.partsAndCosts || [])
													.reduce((acc, item) => acc + item.cost * item.quantity, 0)
													.toFixed(2) || '0.00'}
											</span>
										</div>

										<div class="w-full max-w-full">
											{#if hasSignedContract(draft.teamId)}
												<a
													href={getContractURL(draft.teamId)}
													target="_blank"
													class="w-full px-4 my-8 py-2 bg-white hover:bg-orange-300 text-orange-500 rounded transition-colors border-2 border-orange-500"
												>
													View Contract
												</a>
											{/if}
										</div>

										<button
											class="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
											on:click={async () => {
												draft.copied = true;
												await copyAllEmailsToClipboard(getTeamMembers(draft.teamId));
												setTimeout(() => {
													draft.copied = false;
												}, 300);
											}}
										>
											{#if draft.copied}
												Copying!
											{:else}
												Copy All Emails
											{/if}
										</button>
									</div>

									<!-- Expanded content - only shows when expanded state is true -->
									{#if expandedCardId === draft.teamId}
										<div
											class="absolute top-0 left-0 right-0 bottom-0 bg-white shadow-xl rounded-lg z-10"
											transition:fade
										>
											<div class="p-6 h-full overflow-y-auto">
												<!-- Close button -->
												<button
													class="absolute top-2 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
													on:click={() => (expandedCardId = null)}
													aria-label="Close details view"
												>
													<svg
														class="w-6 h-6"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>

												<div class="space-y-4">
													<h4 class="font-semibold text-gray-700">Title: {draft.title}</h4>
													<p class="text-gray-800">Team ID: {draft.teamId}</p>
													<p class="text-gray-800">{draft.detail}</p>

													{#if draft.image}
														<img
															src={draft.image}
															alt="Project"
															class="rounded-lg max-h-48 w-full object-cover"
														/>
													{/if}

													<div class="overflow-x-auto">
														<table class="w-full divide-y divide-gray-200">
															<thead>
																<tr>
																	<th class="px-2 py-2 text-left text-sm">Part</th>
																	<th class="px-2 py-2 text-left text-sm">Qty</th>
																	<th class="px-2 py-2 text-left text-sm">Cost</th>
																	<th class="px-2 py-2 text-left text-sm">Link</th>
																</tr>
															</thead>
															<tbody class="divide-y divide-gray-200">
																{#each draft.partsAndCosts || [] as item}
																	<tr class={item.reimbursement ? 'bg-blue-100' : ''}>
																		<td class="px-2 py-2 text-sm">{item.part}</td>
																		<td class="px-2 py-2 text-sm">{item.quantity}</td>
																		<td class="px-2 py-2 text-sm">${item.cost}</td>
																		<td class="px-2 py-2 text-sm">
																			{#if item.link}
																				<a
																					href={item.link}
																					target="_blank"
																					class="text-orange-500 hover:text-orange-600">View</a
																				>
																			{/if}
																		</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													</div>

													<!-- Attachments Section -->
													{#if draft.attachments && draft.attachments.length > 0}
														<div class="space-y-3">
															<h5 class="font-semibold text-gray-700">Attachments:</h5>
															<div class="space-y-2">
																{#each draft.attachments as attachment}
																	<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
																		<div class="flex items-center space-x-3">
																			<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
																				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
																			</svg>
																			<span class="text-gray-700 text-sm font-medium">{attachment.name}</span>
																		</div>
																		<a
																			href={attachment.url}
																			target="_blank"
																			class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors"
																		>
																			Download
																		</a>
																	</div>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Track 1 Projects -->
				<div class="mb-12">
					<h3 class="text-3xl font-extrabold mb-8 text-center text-orange-500 pt-6 mx-auto">
						TRACK 1
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
						{#each track1Drafts as draft}
							<div
								class="bg-white rounded-lg relative {hasReimbursements(draft)
									? 'border-4 border-blue-500'
									: ''}"
							>
								<div
									class="bg-white rounded-lg shadow-lg p-6 relative {hasSignedContract(draft.teamId)
										? 'border-4 border-green-500'
										: ''}"
								>
									<!-- Main content always visible -->
									<div class="space-y-4">
										<div class="flex justify-between items-start">
											<h4 class="text-xl font-bold text-gray-800 truncate pr-8">{draft.title}</h4>
											<!-- View Details trigger button -->
											<button
												class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
												on:click={() =>
													(expandedCardId = expandedCardId === draft.teamId ? null : draft.teamId)}
												aria-label="Toggle project details"
												aria-expanded={expandedCardId === draft.teamId}
											>
												<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													/>
												</svg>
											</button>
										</div>

										<p class="text-gray-600 line-clamp-3">{draft.detail}</p>

										<div class="border-t pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team:</h5>
											<div class="truncate">
												<span class="text-gray-600">
													{getTeamName(draft.teamId)}
												</span>
											</div>
										</div>

										<!-- List of member emails -->
										<div class="pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team Members:</h5>
											<div class="space-y-2">
												{#each getTeamMembers(draft.teamId) as member}
													<div class="flex items center group">
														<span class="text-gray-600 truncate">{member.email}</span>
														<button
															class="p-1 hover:bg-gray-100 rounded-full transition-colors"
															on:click={() => copyEmailToClipboard(member.email)}
														>
															{#if copiedEmail === member.email}
																<Check class="w-4 h-4 text-green-500" />
															{:else}
																<Copy class="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
															{/if}
														</button>
													</div>
												{/each}
											</div>
										</div>

										<div>
											<h5 class="font-semibold text-gray-700">Total Cost:</h5>
											<span class="text-gray-800">
												${(draft.partsAndCosts || [])
													.reduce((acc, item) => acc + item.cost * item.quantity, 0)
													.toFixed(2) || '0.00'}
											</span>
										</div>
										<div class="w-full max-w-full">
											{#if hasSignedContract(draft.teamId)}
												<a
													href={getContractURL(draft.teamId)}
													target="_blank"
													class="w-full px-4 my-8 py-2 bg-white hover:bg-orange-300 text-orange-500 rounded transition-colors border-2 border-orange-500"
												>
													View Contract
												</a>
											{/if}
										</div>

										<div class="w-full max-w-full">
											{#if hasSignedContract(draft.teamId)}
												<a
													href={getContractURL(draft.teamId)}
													target="_blank"
													class="w-full px-4 my-8 py-2 bg-white hover:bg-orange-300 text-orange-500 rounded transition-colors border-2 border-orange-500"
												>
													View Contract
												</a>
											{/if}
										</div>

										<button
											class="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
											on:click={async () => {
												draft.copied = true;
												await copyAllEmailsToClipboard(getTeamMembers(draft.teamId));
												setTimeout(() => {
													draft.copied = false;
												}, 300);
											}}
										>
											{#if draft.copied}
												Copying!
											{:else}
												Copy All Emails
											{/if}
										</button>
									</div>

									<!-- Expanded content - only shows when expanded state is true -->
									{#if expandedCardId === draft.teamId}
										<div
											class="absolute top-0 left-0 right-0 bottom-0 bg-white shadow-xl rounded-lg z-10"
											transition:fade
										>
											<div class="p-6 h-full overflow-y-auto">
												<!-- Close button -->
												<button
													class="absolute top-2 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
													on:click={() => (expandedCardId = null)}
													aria-label="Close details view"
												>
													<svg
														class="w-6 h-6"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>

												<div class="space-y-4">
													<h4 class="font-semibold text-gray-700">Title: {draft.title}</h4>
													<p class="text-gray-800">Team ID: {draft.teamId}</p>
													<p class="text-gray-800">{draft.detail}</p>

													{#if draft.image}
														<img
															src={draft.image}
															alt="Project"
															class="rounded-lg max-h-48 w-full object-cover"
														/>
													{/if}

													<div class="overflow-x-auto">
														<table class="w-full divide-y divide-gray-200">
															<thead>
																<tr>
																	<th class="px-2 py-2 text-left text-sm">Part</th>
																	<th class="px-2 py-2 text-left text-sm">Qty</th>
																	<th class="px-2 py-2 text-left text-sm">Cost</th>
																	<th class="px-2 py-2 text-left text-sm">Link</th>
																</tr>
															</thead>
															<tbody class="divide-y divide-gray-200">
																{#each draft.partsAndCosts || [] as item}
																	<tr class={item.reimbursement ? 'bg-blue-100' : ''}>
																		<td class="px-2 py-2 text-sm">{item.part}</td>
																		<td class="px-2 py-2 text-sm">{item.quantity}</td>
																		<td class="px-2 py-2 text-sm">${item.cost}</td>
																		<td class="px-2 py-2 text-sm">
																			{#if item.link}
																				<a
																					href={item.link}
																					target="_blank"
																					class="text-orange-500 hover:text-orange-600">View</a
																				>
																			{/if}
																		</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													</div>

													<!-- Attachments Section -->
													{#if draft.attachments && draft.attachments.length > 0}
														<div class="space-y-3">
															<h5 class="font-semibold text-gray-700">Attachments:</h5>
															<div class="space-y-2">
																{#each draft.attachments as attachment}
																	<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
																		<div class="flex items-center space-x-3">
																			<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
																				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
																			</svg>
																			<span class="text-gray-700 text-sm font-medium">{attachment.name}</span>
																		</div>
																		<a
																			href={attachment.url}
																			target="_blank"
																			class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors"
																		>
																			Download
																		</a>
																	</div>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Track 2 Projects -->
				<div class="mb-12">
					<h3 class="text-3xl font-extrabold mb-8 text-center text-orange-500 pt-6 mx-auto">
						TRACK 2
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each track2Drafts as draft}
							<div
								class="bg-white rounded-lg relative {hasReimbursements(draft)
									? 'border-4 border-blue-500'
									: ''}"
							>
								<div
									class="bg-white rounded-lg shadow-lg p-6 relative {hasSignedContract(draft.teamId)
										? 'border-4 border-green-500'
										: ''}"
								>
									<!-- Main content always visible -->
									<div class="space-y-4">
										<div class="flex justify-between items-start">
											<h4 class="text-xl font-bold text-gray-800 truncate pr-8">{draft.title}</h4>
											<!-- View Details trigger button -->
											<button
												class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
												on:click={() =>
													(expandedCardId = expandedCardId === draft.teamId ? null : draft.teamId)}
												aria-label="Toggle project details"
												aria-expanded={expandedCardId === draft.teamId}
											>
												<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													/>
												</svg>
											</button>
										</div>

										<p class="text-gray-600 line-clamp-3">{draft.detail}</p>

										<div class="border-t pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team:</h5>
											<div class="truncate">
												<span class="text-gray-600">
													{getTeamName(draft.teamId)}
												</span>
											</div>
										</div>

										<!-- List of member emails -->
										<div class="pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team Members:</h5>
											<div class="space-y-2">
												{#each getTeamMembers(draft.teamId) as member}
													<div class="flex items center group">
														<span class="text-gray-600 truncate">{member.email}</span>
														<button
															class="p-1 hover:bg-gray-100 rounded-full transition-colors"
															on:click={() => copyEmailToClipboard(member.email)}
														>
															{#if copiedEmail === member.email}
																<Check class="w-4 h-4 text-green-500" />
															{:else}
																<Copy class="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
															{/if}
														</button>
													</div>
												{/each}
											</div>
										</div>

										<div>
											<h5 class="font-semibold text-gray-700">Total Cost:</h5>
											<span class="text-gray-800">
												${(draft.partsAndCosts || [])
													.reduce((acc, item) => acc + item.cost * item.quantity, 0)
													.toFixed(2) || '0.00'}
											</span>
										</div>

										<button
											class="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
											on:click={async () => {
												draft.copied = true;
												await copyAllEmailsToClipboard(getTeamMembers(draft.teamId));
												setTimeout(() => {
													draft.copied = false;
												}, 300);
											}}
										>
											{#if draft.copied}
												Copying!
											{:else}
												Copy All Emails
											{/if}
										</button>
									</div>

									<!-- Expanded content - only shows when expanded state is true -->
									{#if expandedCardId === draft.teamId}
										<div
											class="absolute top-0 left-0 right-0 bottom-0 bg-white shadow-xl rounded-lg z-10"
											transition:fade
										>
											<div class="p-6 h-full overflow-y-auto">
												<!-- Close button -->
												<button
													class="absolute top-2 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
													on:click={() => (expandedCardId = null)}
													aria-label="Close details view"
												>
													<svg
														class="w-6 h-6"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>

												<div class="space-y-4">
													<h4 class="font-semibold text-gray-700">Title: {draft.title}</h4>
													<p class="text-gray-800">Team ID: {draft.teamId}</p>
													<p class="text-gray-800">{draft.detail}</p>

													{#if draft.image}
														<img
															src={draft.image}
															alt="Project"
															class="rounded-lg max-h-48 w-full object-cover"
														/>
													{/if}

													<div class="overflow-x-auto">
														<table class="w-full divide-y divide-gray-200">
															<thead>
																<tr>
																	<th class="px-2 py-2 text-left text-sm">Part</th>
																	<th class="px-2 py-2 text-left text-sm">Qty</th>
																	<th class="px-2 py-2 text-left text-sm">Cost</th>
																	<th class="px-2 py-2 text-left text-sm">Link</th>
																</tr>
															</thead>
															<tbody class="divide-y divide-gray-200">
																{#each draft.partsAndCosts || [] as item}
																	<tr class={item.reimbursement ? 'bg-blue-100' : ''}>
																		<td class="px-2 py-2 text-sm">{item.part}</td>
																		<td class="px-2 py-2 text-sm">{item.quantity}</td>
																		<td class="px-2 py-2 text-sm">${item.cost}</td>
																		<td class="px-2 py-2 text-sm">
																			{#if item.link}
																				<a
																					href={item.link}
																					target="_blank"
																					class="text-orange-500 hover:text-orange-600">View</a
																				>
																			{/if}
																		</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													</div>

													<!-- Attachments Section -->
													{#if draft.attachments && draft.attachments.length > 0}
														<div class="space-y-3">
															<h5 class="font-semibold text-gray-700">Attachments:</h5>
															<div class="space-y-2">
																{#each draft.attachments as attachment}
																	<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
																		<div class="flex items-center space-x-3">
																			<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
																				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
																			</svg>
																			<span class="text-gray-700 text-sm font-medium">{attachment.name}</span>
																		</div>
																		<a
																			href={attachment.url}
																			target="_blank"
																			class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors"
																		>
																			Download
																		</a>
																	</div>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Unsorted Projects -->
				<div class="mb-24">
					<h3 class="text-3xl font-extrabold mb-8 text-center text-orange-500 pt-6 mx-auto">
						UNSORTED
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each unsortedDrafts as draft}
							<div
								class="bg-white rounded-lg relative {hasReimbursements(draft)
									? 'border-4 border-blue-500'
									: ''}"
							>
								<div
									class="bg-white rounded-lg shadow-lg p-6 relative {hasSignedContract(draft.teamId)
										? 'border-4 border-green-500'
										: ''}"
								>
									<!-- Main content always visible -->
									<div class="space-y-4">
										<div class="flex justify-between items-start">
											<h4 class="text-xl font-bold text-gray-800 truncate pr-8">{draft.title}</h4>
											<!-- View Details trigger button -->
											<button
												class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
												on:click={() =>
													(expandedCardId = expandedCardId === draft.teamId ? null : draft.teamId)}
												aria-label="Toggle project details"
												aria-expanded={expandedCardId === draft.teamId}
											>
												<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													/>
												</svg>
											</button>
										</div>

										<p class="text-gray-600 line-clamp-3">{draft.detail}</p>

										<div class="border-t pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team:</h5>
											<div class="truncate">
												<span class="text-gray-600">
													{getTeamName(draft.teamId)}
												</span>
											</div>
										</div>

										<!-- List of member emails -->
										<div class="pt-4">
											<h5 class="font-semibold text-gray-700 mb-2">Team Members:</h5>
											<div class="space-y-2">
												{#each getTeamMembers(draft.teamId) as member}
													<div class="flex items center group">
														<span class="text-gray-600 truncate">{member.email}</span>
														<button
															class="p-1 hover:bg-gray-100 rounded-full transition-colors"
															on:click={() => copyEmailToClipboard(member.email)}
														>
															{#if copiedEmail === member.email}
																<Check class="w-4 h-4 text-green-500" />
															{:else}
																<Copy class="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
															{/if}
														</button>
													</div>
												{/each}
											</div>
										</div>

										<div>
											<h5 class="font-semibold text-gray-700">Total Cost:</h5>
											<span class="text-gray-800">
												${(draft.partsAndCosts || [])
													.reduce((acc, item) => acc + item.cost * item.quantity, 0)
													.toFixed(2) || '0.00'}
											</span>
										</div>

										<button
											class="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
											on:click={async () => {
												draft.copied = true;
												await copyAllEmailsToClipboard(getTeamMembers(draft.teamId));
												setTimeout(() => {
													draft.copied = false;
												}, 300);
											}}
										>
											{#if draft.copied}
												Copying!
											{:else}
												Copy All Emails
											{/if}
										</button>
									</div>

									<!-- Expanded content - only shows when expanded state is true -->
									{#if expandedCardId === draft.teamId}
										<div
											class="absolute top-0 left-0 right-0 bottom-0 bg-white shadow-xl rounded-lg z-10"
											transition:fade
										>
											<div class="p-6 h-full overflow-y-auto">
												<!-- Close button -->
												<button
													class="absolute top-2 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
													on:click={() => (expandedCardId = null)}
													aria-label="Close details view"
												>
													<svg
														class="w-6 h-6"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>

												<div class="space-y-4">
													<h4 class="font-semibold text-gray-700">Title: {draft.title}</h4>
													<p class="text-gray-800">Team ID: {draft.teamId}</p>
													<p class="text-gray-800">{draft.detail}</p>

													{#if draft.image}
														<img
															src={draft.image}
															alt="Project"
															class="rounded-lg max-h-48 w-full object-cover"
														/>
													{/if}

													<div class="overflow-x-auto">
														<table class="w-full divide-y divide-gray-200">
															<thead>
																<tr>
																	<th class="px-2 py-2 text-left text-sm">Part</th>
																	<th class="px-2 py-2 text-left text-sm">Qty</th>
																	<th class="px-2 py-2 text-left text-sm">Cost</th>
																	<th class="px-2 py-2 text-left text-sm">Link</th>
																</tr>
															</thead>
															<tbody class="divide-y divide-gray-200">
																{#each draft.partsAndCosts || [] as item}
																	<tr class={item.reimbursement ? 'bg-blue-100' : ''}>
																		<td class="px-2 py-2 text-sm">{item.part}</td>
																		<td class="px-2 py-2 text-sm">{item.quantity}</td>
																		<td class="px-2 py-2 text-sm">${item.cost}</td>
																		<td class="px-2 py-2 text-sm">
																			{#if item.link}
																				<a
																					href={item.link}
																					target="_blank"
																					class="text-orange-500 hover:text-orange-600">View</a
																				>
																			{/if}
																		</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													</div>

													<!-- Attachments Section -->
													{#if draft.attachments && draft.attachments.length > 0}
														<div class="space-y-3">
															<h5 class="font-semibold text-gray-700">Attachments:</h5>
															<div class="space-y-2">
																{#each draft.attachments as attachment}
																	<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
																		<div class="flex items-center space-x-3">
																			<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
																				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
																			</svg>
																			<span class="text-gray-700 text-sm font-medium">{attachment.name}</span>
																		</div>
																		<a
																			href={attachment.url}
																			target="_blank"
																			class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors"
																		>
																			Download
																		</a>
																	</div>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom">
		<div class="relative z-100 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					TRACKS
				</h2>
			</div>
			{#if isLoading}
				<div class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
					<div
						class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"
					></div>
				</div>
			{:else}
				<div class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
					<div
						class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"
					></div>
				</div>
			{/if}
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
