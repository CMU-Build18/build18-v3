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
		ThumbsUp,
		ThumbsDown,
		AlertTriangle,
		MessageSquare,
		Users,
		ChevronLeft,
		ChevronRight,
		User
	} from 'lucide-svelte';

	let users = [];
	let teams = [];
	let drafts = [];
	let currentDraftIndex = 0;
	let feedback = '';
	let isSubmitting = false;
	let currentUser;
	let isAdmin = false;

	// Review stats
	let newSubmissions = 0;
	let inReviewSubmissions = 0;
	let reviewedSubmissions = 0;
	let incompleteSubmissions = 0;

	let track1 = 0;
	let track2 = 0;
	let innov18 = 0;

	let teamDrafts = [];

	let allDrafts = [];
	let incompleteStack = [];
	let reviewedStack = [];
	let track1Drafts = [];
	let track2Drafts = [];

	let totalCost = 0;

	let reviewDraft = new Set();
	let toggleTrack1 = false;
	let toggleTrack2 = false;
	let toggleTrack2Unsorted = false;

	// Add reactive statement for drafts
	$: currentDraft = drafts[currentDraftIndex] || null;
	$: totalCost =
		currentDraft?.partsAndCosts.reduce((acc, item) => acc + item.cost * item.quantity, 0) || 0;

	// Function to handle filter toggling
	function handleFilterToggle(filter) {
		if (filter === 'track2') {
			toggleTrack1 = false;
			toggleTrack2 = true;
			toggleTrack2Unsorted = false;
		} else if (filter === 'track2Unsorted') {
			toggleTrack2 = false;
			toggleTrack2Unsorted = true;
		} else if (filter === 'track1') {
			toggleTrack1 = true;
			toggleTrack2 = false;
			toggleTrack2Unsorted = false;
		} else if (filter === 'all') {
			toggleTrack1 = false;
			toggleTrack2 = false;
			toggleTrack2Unsorted = false;
		}
	}

	// Add reactive statement for filtering drafts
	$: {
		if (allDrafts.length > 0) {
			if (toggleTrack1) {
				// Filter only Track 1 projects
				drafts = allDrafts.filter((draft) => draft.track === '1');
			} else {
				// Show all drafts
				drafts = allDrafts;
			}
			if (toggleTrack2) {
				// Filter only Track 2 projects
				drafts = allDrafts.filter((draft) => {
					// const team = teams.find((t) => t.id === draft.teamId);
					// return team?.members.some((userId) => {
					// 	const user = users.find((u) => u.id === userId);
					// 	return user?.track === '2';
					// });

					// where the draft has property 'track' == '2'
					return draft.track === '2';
				});
			} else if (toggleTrack2Unsorted) {
				// Filter Track 2 projects and those without track info
				drafts = allDrafts.filter((draft) => {
					const team = teams.find((t) => t.id === draft.teamId);
					if (!team) return true; // Include if no team found (unsorted)
					return team.members.some((userId) => {
						const user = users.find((u) => u.id === userId);
						return !user?.track || user.track === '2';
					});
				});
			} else {
				// Show all drafts
				drafts = allDrafts;
			}

			// Reset current draft index when filter changes
			currentDraftIndex = 0;
			// Update stats based on filtered drafts
			updateStats();
		}
	}

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

	function getReviewerInfo(reviewerId) {
		const reviewer = users.find((user) => user.id === reviewerId);
		return reviewer
			? {
					name: reviewer.name || reviewer.email || 'Anonymous',
					role: reviewer.role || 'Reviewer',
					avatar: reviewer.avatar
				}
			: {
					name: 'Unknown Reviewer',
					role: 'Reviewer',
					avatar: null
				};
	}

	async function handleSubmission(draftId, status) {
		if (isSubmitting || !feedback.trim()) {
			console.log('Please provide feedback before submitting your review.');
		}

		try {
			isSubmitting = true;
			const draftRef = doc(db, 'verified', draftId);

			// Get the current draft document
			const draftSnap = await getDoc(draftRef);
			if (!draftSnap.exists()) {
				throw new Error('Draft not found');
			}

			const currentData = draftSnap.data();

			// Check if the current user has already reviewed this draft
			if (currentData.reviewers?.includes(currentUser.uid)) {
				console.log('You have already reviewed this draft.');
			}

			// Enhanced review data with reviewer information
			const reviewData = {
				reviewerId: currentUser.uid,
				reviewerName: currentUser.displayName || currentUser.email,
				reviewerRole: users.find((u) => u.id === currentUser.uid)?.role || 'Reviewer',
				feedback: feedback.trim(),
				timestamp: Timestamp.now(),
				status: status
			};

			// Ensure arrays exist before updating
			const existingReviewers = currentData.reviewers || [];
			const existingReviews = currentData.reviews || [];

			const updateData = {
				reviewers: arrayUnion(currentUser.uid),
				reviews: [...existingReviews, reviewData],
				status: status,
				lastReviewedAt: Timestamp.now()
			};

			await updateDoc(draftRef, updateData);

			// Update local state
			drafts = drafts.map((draft) =>
				draft.id === draftId
					? {
							...draft,
							reviewers: [...existingReviewers, currentUser.uid],
							reviews: [...existingReviews, reviewData],
							status: status,
							lastReviewedAt: updateData.lastReviewedAt
						}
					: draft
			);

			// Reset feedback
			feedback = '';

			// Move to next draft if available
			if (currentDraftIndex < drafts.length - 1) {
				navigateDraft('next');
			}

			// Update stats
			updateStats();

			console.log(`Reviewed as successfully ${status}`);
		} catch (error) {
			console.error('Error submitting review:', error);
			alert('Error submitting review. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function updateStats() {
		newSubmissions = drafts.filter((d) => !d.reviewers || d.reviewers.length === 0).length;
		inReviewSubmissions = drafts.filter((d) => d.reviewers?.length > 0 && !d.status).length;
		reviewedSubmissions = drafts.filter(
			(d) => d.status === 'approved' || d.status === 'disapproved'
		).length;
		incompleteSubmissions = drafts.filter((d) => d.status === 'incomplete').length;
	}

	function getStatusColor(status) {
		switch (status) {
			case 'approved':
				return 'text-green-500';
			case 'disapproved':
				return 'text-red-500';
			case 'incomplete':
				return 'text-yellow-500';
			default:
				return 'text-gray-500';
		}
	}

	function getStatusIcon(status) {
		switch (status) {
			case 'approved':
				return ThumbsUp;
			case 'disapproved':
				return ThumbsDown;
			case 'incomplete':
				return AlertTriangle;
			default:
				return MessageSquare;
		}
	}

	function navigateDraft(direction) {
		if (direction === 'next' && currentDraftIndex < drafts.length - 1) {
			currentDraftIndex++;
		} else if (direction === 'prev' && currentDraftIndex > 0) {
			currentDraftIndex--;
		}
		feedback = '';
	}

	onMount(async () => {
		try {
			// Set up real-time listener for drafts
			const draftsQuery = query(collection(db, 'drafts'));
			const unsubscribeDrafts = onSnapshot(draftsQuery, (snapshot) => {
				allDrafts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
				drafts = allDrafts; // Initial assignment
				updateStats();
			});

			// Load users and teams
			const [usersSnapshot, teamsSnapshot] = await Promise.all([
				getDocs(query(collection(db, 'users'))),
				getDocs(query(collection(db, 'teams')))
			]);

			users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
			teams = teamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

			// Process team data
			teams.forEach((team) => {
				// for each team, check each user in the team for track, but only count once for each team
				let countedTracks = new Set();
				team.members.forEach((userId) => {
					const user = users.find((user) => user.id === userId);
					if (user && !countedTracks.has(team.id)) {
						countedTracks.add(team.id);
						if (user.track === '1') {
							track1++;

							// Search for drafts by the user's team
							teamDrafts = drafts.filter((draft) => draft.teamId == team.id);
							track1Drafts.push(...teamDrafts);
						} else if (user.track === '2') {
							track2++;

							// Add to Track 2 drafts for review
							teamDrafts = drafts.filter((draft) => draft.teamId == team.id);
							track2Drafts.push(...teamDrafts);
						} else if (user.innov18) {
							innov18++;
						}
					}
				});
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
</script>

{#if isAdmin}
	<div class="bg-white bg-custom">
		<div class="relative z-100">
			<div class="p-4 max-w-6xl mx-auto min-h-full pb-48">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-14 mx-auto">
					PROJECT REVIEW
				</h2>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Unreviewed</span>
							<span class="block text-3xl font-bold text-orange-500">{newSubmissions}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">In Review</span>
							<span class="block text-3xl font-bold text-orange-500">{inReviewSubmissions}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Reviewed</span>
							<span class="block text-3xl font-bold text-orange-500">{reviewedSubmissions}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Incomplete</span>
							<span class="block text-3xl font-bold text-yellow-500">{incompleteSubmissions}</span>
						</div>
					</div>
				</div>

				<!-- Project Review Interface -->
				{#if drafts.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- Project Details (2/3 width) -->
						<div class="bg-white rounded-lg shadow p-6 md:col-span-2">
							<div class="flex justify-between items-center mb-4">
								<h3 class="text-xl font-bold text-gray-800">Project Submission</h3>
								<div class="text-sm text-gray-500">
									{#if drafts[currentDraftIndex].lastUpdated?.toDate}
										{drafts[currentDraftIndex].lastUpdated.toDate().toLocaleDateString()}
									{:else}
										No date
									{/if}
								</div>
							</div>

							{#if drafts[currentDraftIndex].status}
								<div class="mb-4">
									<span
										class={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(drafts[currentDraftIndex].status)} bg-opacity-10`}
									>
										<svelte:component
											this={getStatusIcon(drafts[currentDraftIndex].status)}
											size={14}
											class="mr-1"
										/>
										{drafts[currentDraftIndex].status.charAt(0).toUpperCase() +
											drafts[currentDraftIndex].status.slice(1)}
									</span>
								</div>
							{/if}

							<div class="space-y-4">
								<div>
									<h4 class="font-semibold text-gray-700">Title</h4>
									<p class="text-gray-800">{drafts[currentDraftIndex].title}</p>
								</div>

								<div>
									<h4 class="font-semibold text-gray-700">Team ID</h4>
									<p class="text-gray-800">{drafts[currentDraftIndex].teamId}</p>
								</div>

								<div>
									<h4 class="font-semibold text-gray-700">Details</h4>
									<p class="text-gray-800">{drafts[currentDraftIndex].detail}</p>
								</div>

								{#if drafts[currentDraftIndex].image}
									<div>
										<h4 class="font-semibold text-gray-700">Project Image</h4>
										<img
											src={drafts[currentDraftIndex].image}
											alt="Project"
											class="mt-2 rounded-lg max-h-64 w-auto"
										/>
									</div>
								{/if}

								<div>
									<h4 class="font-semibold text-gray-700 bg-yellow-200 inline-block px-2 rounded">
										${totalCost.toFixed(2)}
									</h4>
									<div class="mt-2 overflow-x-auto">
										<table class="min-w-full divide-y divide-gray-200">
											<thead>
												<tr>
													<th class="px-4 py-2 text-left">Part</th>
													<th class="px-4 py-2 text-left">Quantity</th>
													<th class="px-4 py-2 text-left">Cost</th>
													<th class="px-4 py-2 text-left">Link</th>
												</tr>
											</thead>
											<tbody>
												{#each drafts[currentDraftIndex].partsAndCosts || [] as item}
													<tr>
														<td class="px-4 py-2">{item.part}</td>
														<td class="px-4 py-2">{item.quantity}</td>
														<td class="px-4 py-2">${item.cost}</td>
														<td class="px-4 py-2">
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
								</div>
							</div>
						</div>

						<!-- Review Interface (1/3 width) -->
						<div class="bg-white rounded-lg shadow p-6">
							<h3 class="text-xl font-bold text-gray-800 mb-4">Review</h3>

							<!-- Navigation -->
							<div class="flex justify-between items-center mb-4">
								<button
									class="p-2 text-gray-600 hover:text-orange-500 disabled:opacity-50"
									on:click={() => navigateDraft('prev')}
								>
									<ChevronLeft size={20} />
								</button>
								<span class="text-sm text-gray-600">
									Project {currentDraftIndex + 1} of {drafts.length}
								</span>
								<button
									class="p-2 text-gray-600 hover:text-orange-500 disabled:opacity-50"
									on:click={() => navigateDraft('next')}
								>
									<ChevronRight size={20} />
								</button>
							</div>

							<!-- Review Form -->
							<div class="space-y-4">
								<div>
									<!-- Checkboxes for filtering -->
									<div class="flex items-center gap-2 pb-4">
										<span class="text-sm font-medium text-gray-700">Filter by Track:</span>
										<button
											class={`px-2 py-1 rounded-md hover:bg-gray-300 ${toggleTrack1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
											on:click={() => handleFilterToggle('track1')}
											aria-label="Filter by Track 1"
										>
											1
										</button>
										<button
											class={`px-2 py-1 rounded-md hover:bg-gray-300 ${toggleTrack2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
											on:click={() => handleFilterToggle('track2')}
											aria-label="Filter by Track 2"
										>
											2
										</button>

										<button
											class={`px-2 py-1 rounded-md hover:bg-gray-300 ${!toggleTrack2 && !toggleTrack2Unsorted && !toggleTrack1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
											on:click={() => handleFilterToggle('all')}
											aria-label="Show All Tracks"
										>
											All
										</button>
									</div>
									<label for="feedback-textarea" class="block text-sm font-medium text-gray-700 mb-2"> Feedback </label>
									<textarea
										id="feedback-textarea"
										bind:value={feedback}
										class="w-full p-2 border border-gray-300 rounded-md"
										rows="4"
										placeholder="Enter your feedback..."
									></textarea>
								</div>

								<!-- Vote Buttons -->
								<div class="flex flex-col gap-2">
									<button
										class="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleSubmission(drafts[currentDraftIndex].id, 'approved')}
									>
										<ThumbsUp size={16} />
										Approve
									</button>
									<button
										class="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleSubmission(drafts[currentDraftIndex].id, 'disapproved')}
									>
										<ThumbsDown size={16} />
										Disapprove
									</button>
									<button
										class="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleSubmission(drafts[currentDraftIndex].id, 'incomplete')}
									>
										<AlertTriangle size={16} />
										Mark as Incomplete
									</button>
								</div>

								{#if drafts[currentDraftIndex].reviews && drafts[currentDraftIndex].reviews.length > 0}
									<div class="mt-6">
										<h4 class="font-semibold text-gray-700 mb-2">Previous Reviews</h4>
										<div class="space-y-3">
											{#each drafts[currentDraftIndex].reviews as review}
												<div class="p-4 bg-gray-50 rounded-md">
													<!-- Reviewer Info -->
													<div class="flex items-center gap-3 mb-2">
														<div
															class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"
														>
															{#if getReviewerInfo(review.reviewerId).avatar}
																<img
																	src={getReviewerInfo(review.reviewerId).avatar}
																	alt="Reviewer"
																	class="w-8 h-8 rounded-full"
																/>
															{:else}
																<User size={16} class="text-orange-500" />
															{/if}
														</div>
														<div class="flex-1">
															<div class="flex items-center justify-between">
																<div>
																	<span class="font-medium text-gray-900">
																		{getReviewerInfo(review.reviewerId).name}
																	</span>
																	<span class="text-sm text-gray-500 ml-2">
																		{getReviewerInfo(review.reviewerId).role}
																	</span>
																</div>
																<span class="text-sm text-gray-500">
																	{review.timestamp.toDate().toLocaleDateString()}
																</span>
															</div>
														</div>
													</div>

													<!-- Review Status and Feedback -->
													<div class="ml-11">
														<div class="flex items-center gap-2 mb-2">
															<span class={getStatusColor(review.status)}>
																<svelte:component this={getStatusIcon(review.status)} size={14} />
																<span class="ml-1 text-sm">
																	{review.status.charAt(0).toUpperCase() + review.status.slice(1)}
																</span>
															</span>
														</div>
														<p class="text-sm text-gray-700">{review.feedback}</p>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center py-8">
						<p class="text-gray-600">No projects available for review.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom">
		<div class="relative z-100 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					REVIEW
				</h2>
			</div>
			<p>Please login as admin or return to home.</p>
			<button
				class="bg-orange-500 text-white px-4 py-2 rounded-lg mt-4"
				on:click={() => (window.location.href = '/')}>Home</button
			>
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
