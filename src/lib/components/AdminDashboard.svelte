<script>
	import { onMount, tick } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import { collection, query, getDocs, doc, getDoc, Timestamp, where } from 'firebase/firestore';

	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-moment';
	import { ScanQrCode, UsersRound, Search, ArrowUpWideNarrow } from 'lucide-svelte';

	let isAdmin = false;
	let currentUser;
	let isLoading = false;

	let users = [];
	let teams = [];
	let drafts = [];
	let drafts2026 = [];
	let totalUsers = 0;
	let totalTeams = 0;
	let totalDrafts = 0;
	let totalLogins2026 = 0;
	let totalDrafts2026 = 0;
	let usersPerTrackData = {};
	let dietaryConsiderationsData = {};
	let shirtSizesData = {};
	let classYearData = {};
	let genderData = {};
	let ethnicityData = {};
	let schoolData = {};
	let buildIntentData = {};
	let preliminaryPartsData = {};

	// Temp headline stats
	let rsvp926 = 0;
	let rsvp104 = 0;
	let projectDrafts = 0;

	let track1 = 0;
	let track2 = 0;
	let innov18 = 0;

	// Logistics order
	let milkTea = 0;
	let fruitTea = 0;
	let noSelection = 0;

	// Check-ins
	let checkins = [];
	let totalCheckins = 0;

	let dataLoaded = false;

	let labels = [];
	let data = [];

	onMount(async () => {
		await loadData();
		dataLoaded = true;
		await tick(); // Waits for the DOM to update after any reactive changes

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

		createCharts();

		// Cleanup function
		return () => {
			unsubscribeAuth();
		};
	});

	async function loadData() {
		const usersQuery = query(collection(db, 'users'));
		const teamsQuery = query(collection(db, 'teams'));
		const checkinsQuery = query(collection(db, 'checkins'));
		const draftsQuery = query(collection(db, '2026-drafts'));
		const drafts2026Query = query(collection(db, '2026-drafts'));

		const [usersSnapshot, teamsSnapshot, checkinsSnapshot, draftsSnapshot, drafts2026Snapshot] = await Promise.all([
			getDocs(usersQuery),
			getDocs(teamsQuery),
			getDocs(checkinsQuery),
			getDocs(draftsQuery),
			getDocs(drafts2026Query)
		]);

		users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		teams = teamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		checkins = checkinsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		drafts = draftsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		drafts2026 = drafts2026Snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		totalUsers = users.length;
		totalTeams = teams.length;
		totalLogins2026 = users.filter(user => user.lastDashboardVisit).length;
		totalCheckins = checkins.length;
		totalDrafts = drafts.length;
		totalDrafts2026 = drafts2026.length;

		// Process user data
		users.forEach((user) => {
			usersPerTrackData[user.track] = (usersPerTrackData[user.track] || 0) + 1;
			dietaryConsiderationsData[user.dietaryConsiderations] =
				(dietaryConsiderationsData[user.dietaryConsiderations] || 0) + 1;
			shirtSizesData[user.shirtSize] = (shirtSizesData[user.shirtSize] || 0) + 1;
			classYearData[user.classYear] = (classYearData[user.classYear] || 0) + 1;
			genderData[user.gender] = (genderData[user.gender] || 0) + 1;
			ethnicityData[user.ethnicity] = (ethnicityData[user.ethnicity] || 0) + 1;
			schoolData[user.school] = (schoolData[user.school] || 0) + 1;
			buildIntentData[user.buildIntent] = (buildIntentData[user.buildIntent] || 0) + 1;
			preliminaryPartsData[user.preliminaryParts] =
				(preliminaryPartsData[user.preliminaryParts] || 0) + 1;

			// if the user has an array of rsvps, print the last entry
			if (user.rsvps) {
				const lastRsvp = user.rsvps[user.rsvps.length - 1];
				try {
					if (lastRsvp.rsvp926) {
						rsvp926++;
					}
					if (lastRsvp.rsvp104) {
						rsvp104++;
					}
					if (lastRsvp.drink === 'Milk Tea') {
						milkTea++;
					} else if (lastRsvp.drink === 'Fruit Tea') {
						fruitTea++;
					} else {
						noSelection++;
					}
				} catch (error) {
					//console.error('Error parsing RSVP data:', error);
				}
			}
		});

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
					} else if (user.track === '2') {
						track2++;
					} else if (user.innov18) {
						innov18++;
					}
				}
			});
		});

		// Show number of draft submissions over time with lastUpdated property in a line chart
		const projectSubmissionTimes = [];
		const projectSubmissionCounts = {}; // Dictionary to store count of submissions per day

		drafts.forEach((draft) => {
			// check lastUpdated property and store with project count for that day
			const lastUpdated = draft.lastUpdated;

			// Skip if lastUpdated is undefined or null
			if (!lastUpdated) {
				return;
			}

			// Convert the firestore datestring to a date string
			const date = lastUpdated.toDate().toISOString().split('T')[0];

			// Increment the count for that date
			projectSubmissionCounts[date] = (projectSubmissionCounts[date] || 0) + 1;
		});

		// Convert the dates and counts into arrays for the chart, sorted by date
		labels = Object.keys(projectSubmissionCounts).sort(); // Dates as labels, sorted
		data = labels.map((date) => projectSubmissionCounts[date]); // Corresponding counts
	}

	let showCharts = false;
	function createCharts() {
		showCharts = true;

		setTimeout(() => {
			actualCreateCharts();
		}, 1000);
	}

	// don't judge me i was tired and svelte conditional rendering did not play nice with chart.js
	function actualCreateCharts() {
		createChart('dietaryConsiderationsChart', 'Dietary Considerations', dietaryConsiderationsData);
		createChart('shirtSizesChart', 'T-Shirt Sizes', shirtSizesData);
		createChart('classYearChart', 'Class Year Distribution', classYearData);
		createChart('genderChart', 'Gender Distribution', genderData);
		createChart('ethnicityChart', 'Ethnicity Distribution', ethnicityData);
		createChart('schoolChart', 'School Distribution', schoolData);
		createLineChart('projectSubmissionTimes', 'Project Submissions', labels, data);
	}

	function createLineChart(canvasId, label, labels, data) {
		const ctx = document.getElementById(canvasId)?.getContext('2d');
		new Chart(ctx, {
			type: 'line',
			data: {
				labels: labels, // X-axis labels (dates)
				datasets: [
					{
						label: label,
						data: data, // Y-axis data (counts)
						backgroundColor: '#FF8236',
						borderColor: '#FF8236',
						borderWidth: 1,
						fill: false,
						tension: 0.1
					}
				]
			},
			options: {
				responsive: true,
				scales: {
					x: {
						type: 'time', // Requires date adapter
						time: {
							unit: 'day',
							tooltipFormat: 'YYYY-MM-DD'
						}
					},
					y: {
						beginAtZero: true,
						precision: 0
					}
				}
			}
		});
	}
	function createChart(canvasId, label, data) {
		const ctx = document.getElementById(canvasId)?.getContext('2d');
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: Object.keys(data),
				datasets: [
					{
						label: label,
						data: Object.values(data),
						backgroundColor: '#FF8236',
						borderColor: '#FF8236',
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				scales: {
					y: {
						beginAtZero: true,
						precision: 0
					}
				}
			}
		});
	}

	function searchData() {
		// Get the search input element
		const searchInputElement = document.querySelector('#searchQuery');

		// Error checking: Ensure the element exists
		if (!searchInputElement) {
			alert('Search input field not found!');
			return;
		}

		const searchInput = searchInputElement.value.trim().toLowerCase();

		// Error checking: Ensure the input is not empty
		if (!searchInput) {
			alert('Please enter a search query.');
			return;
		}

		let searchResults = [];

		// Enhanced search for users with more traits
		const userResults = users.filter((user) => {
			return (
				safeIncludes(user.firstName, searchInput) ||
				safeIncludes(user.lastName, searchInput) ||
				safeIncludes(user.name, searchInput) ||
				safeIncludes(user.id, searchInput) ||
				safeIncludes(user.andrewId, searchInput) ||
				safeIncludes(user.email, searchInput) ||
				safeIncludes(user.team, searchInput) ||
				safeIncludes(user.teamId, searchInput) ||
				safeIncludes(user.projectId, searchInput) ||
				safeIncludes(user.discord, searchInput) ||
				safeIncludes(user.school, searchInput) ||
				safeIncludes(user.majorProgram, searchInput) ||
				safeIncludes(user.classYear, searchInput) ||
				safeIncludes(user.track, searchInput) ||
				safeIncludes(user.gender, searchInput) ||
				safeIncludes(user.ethnicity, searchInput) ||
				safeIncludes(user.buildIntent, searchInput) ||
				safeIncludes(user.shirtSize, searchInput) ||
				safeIncludes(user.dietaryConsiderations, searchInput)
			);
		}).map(user => ({ ...user, category: 'User', searchType: 'user' }));

		// Enhanced search for teams with member information
		const teamResults = teams.filter((team) => {
			return (
				safeIncludes(team.name, searchInput) ||
				safeIncludes(team.id, searchInput) ||
				safeIncludes(team.projectId, searchInput) ||
				// Search in team member names
				(team.members && team.members.some(memberId => {
					const member = users.find(u => u.id === memberId);
					return member && (
						safeIncludes(member.firstName, searchInput) ||
						safeIncludes(member.lastName, searchInput) ||
						safeIncludes(member.andrewId, searchInput)
					);
				}))
			);
		}).map(team => ({ ...team, category: 'Team', searchType: 'team' }));

		// Enhanced search for drafts
		const draftResults = drafts.filter((draft) => {
			return (
				safeIncludes(draft.title, searchInput) ||
				safeIncludes(draft.id, searchInput) ||
				safeIncludes(draft.team, searchInput) ||
				safeIncludes(draft.teamId, searchInput) ||
				safeIncludes(draft.description, searchInput) ||
				safeIncludes(draft.detail, searchInput) ||
				safeIncludes(draft.extendedDetails, searchInput)
			);
		}).map(draft => ({ ...draft, category: 'Draft (2025)', searchType: 'draft' }));

		// Enhanced search for 2026 drafts
		const draft2026Results = drafts2026.filter((draft) => {
			return (
				safeIncludes(draft.title, searchInput) ||
				safeIncludes(draft.id, searchInput) ||
				safeIncludes(draft.team, searchInput) ||
				safeIncludes(draft.teamId, searchInput) ||
				safeIncludes(draft.description, searchInput) ||
				safeIncludes(draft.detail, searchInput) ||
				safeIncludes(draft.extendedDetails, searchInput)
			);
		}).map(draft => ({ ...draft, category: 'Draft (2026)', searchType: 'draft2026' }));

		// Combine all results
		searchResults = [...userResults, ...teamResults, ...draftResults, ...draft2026Results];

		// Show results in a modal
		showModal(searchResults);
	}

	// Helper function to safely check if a value includes the search input
	function safeIncludes(value, searchInput) {
		// Convert value to string and handle null/undefined cases
		if (!value) return false;
		const stringValue = String(value).toLowerCase();
		return stringValue.includes(searchInput);
	}

	// Function to get track color for users
	function getTrackColor(user) {
		if (user.innov18) return 'bg-purple-100 text-purple-800';
		if (user.track === '1') return 'bg-blue-100 text-blue-800';
		if (user.track === '2') return 'bg-green-100 text-green-800';
		return 'bg-gray-100 text-gray-800';
	}

	// Function to get track name
	function getTrackName(user) {
		if (user.innov18) return 'Innovation 18';
		if (user.track === '1') return 'Track 1';
		if (user.track === '2') return 'Track 2';
		return 'No Track';
	}

	// Function to display the modal with search results
	function showModal(results) {
		const modal = document.querySelector('#searchResultsModal');
		const modalContent = document.querySelector('#modalContent');
		const resultsCount = document.querySelector('#resultsCount');

		// Clear previous results
		modalContent.innerHTML = '';

		// Update results count
		resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;

		if (results.length === 0) {
			modalContent.innerHTML = '<p class="text-gray-500 text-center py-8">No results found. Try different search terms.</p>';
		} else {
			const container = document.createElement('div');
			container.classList.add('space-y-4');

			results.forEach((result) => {
				const resultDiv = document.createElement('div');
				resultDiv.classList.add('border', 'border-gray-300', 'rounded-lg', 'p-4', 'bg-white');
				
				let resultHTML = '';

				if (result.searchType === 'user') {
					const contractStatus = result.contractURL ? 
						'<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">Contract Signed</span>' : 
						'<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">No Contract</span>';
					
					const trackBadge = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrackColor(result)} ml-2">${getTrackName(result)}</span>`;
					
					resultHTML = `
						<div class="flex justify-between items-start">
							<div>
								<h3 class="text-lg font-semibold text-gray-900">${result.firstName || 'Unknown'} ${result.lastName || 'User'}</h3>
								<div class="flex flex-wrap items-center mt-1">
									<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">User</span>
									${trackBadge}
									${contractStatus}
								</div>
								<div class="mt-2 text-sm text-gray-600">
									<p><strong>ID:</strong> ${result.id}</p>
									${result.andrewId ? `<p><strong>Andrew ID:</strong> ${result.andrewId}</p>` : ''}
									${result.email ? `<p><strong>Email:</strong> ${result.email}</p>` : ''}
									${result.school ? `<p><strong>School:</strong> ${result.school}</p>` : ''}
									${result.classYear ? `<p><strong>Class Year:</strong> ${result.classYear}</p>` : ''}
									${result.discord ? `<p><strong>Discord:</strong> ${result.discord}</p>` : ''}
									${result.teamId ? `<p><strong>Team ID:</strong> ${result.teamId}</p>` : ''}
								</div>
							</div>
							${result.contractURL ? `<div><a href="${result.contractURL}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">View Contract</a></div>` : ''}
						</div>`;
				} else if (result.searchType === 'team') {
					const membersList = result.members ? result.members.map(memberId => {
						const member = users.find(u => u.id === memberId);
						if (member) {
							const memberTrackColor = getTrackColor(member);
							const memberTrackName = getTrackName(member);
							return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${memberTrackColor} mr-1 mb-1">${member.firstName} ${member.lastName} (${memberTrackName})</span>`;
						}
						return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1 mb-1">${memberId}</span>`;
					}).join('') : 'No members';
					
					resultHTML = `
						<div>
							<h3 class="text-lg font-semibold text-gray-900">${result.name || 'Unnamed Team'}</h3>
							<div class="flex items-center mt-1">
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Team</span>
							</div>
							<div class="mt-2 text-sm text-gray-600">
								<p><strong>Team ID:</strong> ${result.id}</p>
								${result.projectId ? `<p><strong>Project ID:</strong> ${result.projectId}</p>` : ''}
								<div class="mt-2">
									<strong>Members:</strong>
									<div class="mt-1 flex flex-wrap">${membersList}</div>
								</div>
							</div>
						</div>`;
				} else if (result.searchType === 'draft' || result.searchType === 'draft2026') {
					resultHTML = `
						<div>
							<h3 class="text-lg font-semibold text-gray-900">${result.title || 'Untitled Draft'}</h3>
							<div class="flex items-center mt-1">
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${result.searchType === 'draft2026' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${result.category}</span>
							</div>
							<div class="mt-2 text-sm text-gray-600">
								<p><strong>Draft ID:</strong> ${result.id}</p>
								${result.teamId ? `<p><strong>Team ID:</strong> ${result.teamId}</p>` : ''}
								${result.team ? `<p><strong>Team Name:</strong> ${result.team}</p>` : ''}
								${result.detail ? `<p><strong>Description:</strong> ${result.detail.substring(0, 100)}${result.detail.length > 100 ? '...' : ''}</p>` : ''}
							</div>
						</div>`;
				}
				
				resultDiv.innerHTML = resultHTML;
				container.appendChild(resultDiv);
			});

			modalContent.appendChild(container);
		}

		modal.style.display = 'block';
	}

	// Close the modal
	function closeModal() {
		const modal = document.querySelector('#searchResultsModal');
		modal.style.display = 'none';
	}

	// Close modal when clicking outside
	function handleModalClick(event) {
		if (event.target.id === 'searchResultsModal') {
			closeModal();
		}
	}
</script>

{#if isAdmin}
	<div class="bg-white bg-custom">
		<div class="relative z-100">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					ADMIN
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Total Users</span>
							<span class="block text-3xl font-bold text-orange-500">{totalUsers}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">2026 Logins</span>
							<span class="block text-3xl font-bold text-orange-500">{totalLogins2026}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">2026 Drafts</span>
							<span class="block text-3xl font-bold text-orange-500">{totalDrafts2026}</span>
						</div>
					</div>
				</div>

				<div class="border-4 border-orange-500 rounded-lg mb-8 p-4">
					<div class="flex space-x-4 mb-8">
						<a href="/calendar-admin" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Calendar</div>
						</a>
						<a href="/email-admin" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Emails</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-8">
						<a href="/scan" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Scan</div>
						</a>
						<a href="/checkins" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">View</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-8">
						<a href="/review" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Review</div>
						</a>
						<a href="/tracks" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Tracks</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-8">
						<a href="/discord" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Discord</div>
						</a>
						<a href="/procurement" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Procurement</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-8">
						<a href="/link" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Link</div>
						</a>
						<a href="/links" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Links</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-8">
						<a href="/receipt" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Receipt</div>
						</a>
						<a href="/receipts" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Receipts</div>
						</a>
					</div>
					<div class="flex space-x-4 mb-0">
						<a href="/survey" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Survey</div>
						</a>
						<a href="/partsbyteam" class="flex-1 text-white font-semibold">
							<div class="bg-orange-500 rounded-lg shadow p-4 text-center">Parts by Team</div>
						</a>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4 mb-20">
					<h3 class="text-xl font-semibold text-orange-500 mb-4">Search</h3>

					<div class="flex items-center justify-center">
						<div class="flex-1">
							<input
								type="text"
								id="searchQuery"
								placeholder="Search by name, id, team, project, track, school, discord..."
								class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-orange-500 focus:ring-opacity-50"
								on:keydown={(e) => e.key === 'Enter' && searchData()}
							/>
						</div>
						<div class="ml-4">
							<button
								type="button"
								on:click={searchData}
								class="flex items-center justify-center bg-orange-500 text-white px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-orange-500 focus:ring-opacity-50 hover:bg-orange-600 transition-colors"
								title="Search"
							>
								<Search class="w-6 h-6" />
							</button>
						</div>
					</div>
				</div>

				<!-- Modal -->
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				<div
					id="searchResultsModal"
					class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
					style="display: none;"
					on:click={handleModalClick}
					on:keydown={(e) => e.key === 'Escape' && closeModal()}
					role="dialog"
					aria-modal="true"
					tabindex="-1"
				>
					<div class="bg-white rounded-lg shadow-lg p-6 w-5/6 max-w-4xl mx-auto my-auto max-h-[90vh] flex flex-col">
						<div class="flex justify-between items-center mb-4">
							<div>
								<h3 class="text-xl font-bold text-gray-700">Search Results</h3>
								<p id="resultsCount" class="text-sm text-gray-500 mt-1"></p>
							</div>
							<button
								class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
								on:click={closeModal}
							>
								×
							</button>
						</div>
						<div id="modalContent" class="overflow-y-auto flex-1 pr-2"></div>
						<div class="mt-4 pt-4 border-t">
							<button
								class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
								on:click={closeModal}
							>
								Close
							</button>
						</div>
					</div>
				</div>

				{#if showCharts}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">Project Submissions</h3>
							<canvas id="projectSubmissionTimes"></canvas>
						</div>
						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">T-Shirt Sizes</h3>
							<canvas id="shirtSizesChart"></canvas>
						</div>

						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">Class Year Distribution</h3>
							<canvas id="classYearChart"></canvas>
						</div>

						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">Gender Distribution</h3>
							<canvas id="genderChart"></canvas>
						</div>

						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">Ethnicity Distribution</h3>
							<canvas id="ethnicityChart"></canvas>
						</div>

						<div class="bg-white rounded-lg shadow p-4 mb-6">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">Dietary Considerations</h3>
							<canvas id="dietaryConsiderationsChart"></canvas>
						</div>
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
					ADMIN
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
