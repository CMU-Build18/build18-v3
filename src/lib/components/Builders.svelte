<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { collection, query, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
	import { Search } from 'lucide-svelte';
	import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
	import Chart from 'chart.js/auto';

	let users = [];
	let classYearData = {};
	let genderData = {};
	let ethnicityData = {};
	let schoolData = {};

	let firstYears = new Set();
	let secondYears = new Set();
	let thirdYears = new Set();
	let fourthYears = new Set();
	let masters = new Set();
	let phds = new Set();

	let internshipInterested = new Set();
	let fullTimeInterested = new Set();

	let startWinter2024 = new Set();
	let startSpring2025 = new Set();
	let startSummer2025 = new Set();
	let startFall2025 = new Set();

	let searchQuery = '';
	let showBuilders = false;
	let displayArray = [];

	let isSponsor = false;

	onMount(async () => {
		const storage = getStorage();
		const storageRef = ref(storage, 'resumes');
		const listRef = await listAll(storageRef);
		listRef.items.forEach(async (itemRef) => {
			const url = await getDownloadURL(itemRef);
			console.log(url);
		});

		const q = query(collection(db, 'users'));
		const querySnapshot = await getDocs(q);
		users = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		users.forEach((user) => {
			classYearData[user.classYear] = (classYearData[user.classYear] || 0) + 1;
			genderData[user.gender] = (genderData[user.gender] || 0) + 1;
			ethnicityData[user.ethnicity] = (ethnicityData[user.ethnicity] || 0) + 1;
			schoolData[user.school] = (schoolData[user.school] || 0) + 1;

			if (user.classYear) {
				switch (user.classYear) {
					case 'First Year':
						firstYears.add(user.id);
						break;
					case 'Sophomore':
						secondYears.add(user.id);
						break;
					case 'Junior':
						thirdYears.add(user.id);
						break;
					case 'Senior':
						fourthYears.add(user.id);
						break;
					case 'Masters':
						masters.add(user.id);
						break;
					case 'Doctorate':
						phds.add(user.id);
						break;
				}
			}

			if (user.searchingInternship) {
				internshipInterested.add(user.id);
			}
			if (user.searchingFullTime) {
				fullTimeInterested.add(user.id);
			}

			if (Array.isArray(user.startDates)) {
				if (user.startDates.includes('Winter 2024')) {
					startWinter2024.add(user.id);
				}
				if (user.startDates.includes('Spring 2025')) {
					startSpring2025.add(user.id);
				}
				if (user.startDates.includes('Summer 2025')) {
					startSummer2025.add(user.id);
				}
				if (user.startDates.includes('Fall 2025')) {
					startFall2025.add(user.id);
				}
			}
		});
		delete classYearData['undefined'];
		delete classYearData['Pick one'];
		delete genderData['Prefer to self-describe'];
		delete genderData['Pick one'];
		delete genderData['undefined'];

		setTimeout(() => {
			createCharts();
		}, 1000);
	});

	async function checkPassword(password) {
		// check every document in /sponsors for the password
		const q = query(collection(db, 'sponsors'));
		const querySnapshot = await getDocs(q);
		querySnapshot.docs.forEach((doc) => {
			if (doc.data().password === password) {
				isSponsor = true;
				console.log(doc.data().sponsor);
			}
		});
	}

	// check url params for password
	const urlParams = new URLSearchParams(window.location.search);
	const password = urlParams.get('p');

	checkPassword(password);

	function createCharts() {
		createChart('classYearChart', 'Class Year Distribution', classYearData);
		createChart('genderChart', 'Gender Distribution', genderData);
		createChart('ethnicityChart', 'Ethnicity Distribution', ethnicityData);
		createChart('schoolChart', 'School Distribution', schoolData);
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

	function searchBuilders() {
		// Get all selected checkboxes
		const selectedClassYears = Array.from(
			document.querySelectorAll('#classYear input:checked')
		).map((cb) => cb.value);
		const selectedStartDates = Array.from(
			document.querySelectorAll('#startDates input:checked')
		).map((cb) => cb.value);
		const selectedRoles = Array.from(document.querySelectorAll('#searching input:checked')).map(
			(cb) => cb.value
		);

		// Map checkbox values to the corresponding Sets
		const relevantSets = [];

		// Add relevant class year sets
		if (selectedClassYears.includes('first')) relevantSets.push(firstYears);
		if (selectedClassYears.includes('second')) relevantSets.push(secondYears);
		if (selectedClassYears.includes('third')) relevantSets.push(thirdYears);
		if (selectedClassYears.includes('fourth')) relevantSets.push(fourthYears);
		if (selectedClassYears.includes('masters')) relevantSets.push(masters);
		if (selectedClassYears.includes('phd')) relevantSets.push(phds);

		// Add relevant start date sets
		if (selectedStartDates.includes('winter2024')) relevantSets.push(startWinter2024);
		if (selectedStartDates.includes('spring2025')) relevantSets.push(startSpring2025);
		if (selectedStartDates.includes('summer2025')) relevantSets.push(startSummer2025);
		if (selectedStartDates.includes('fall2025')) relevantSets.push(startFall2025);

		// Add relevant role sets
		if (selectedRoles.includes('internship')) relevantSets.push(internshipInterested);
		if (selectedRoles.includes('full-time')) relevantSets.push(fullTimeInterested);

		// Perform a union of all selected sets
		const combinedSet = new Set(relevantSets.flatMap((set) => Array.from(set)));

		// Convert to array or use directly
		const resultArray = Array.from(combinedSet);
		showResults(resultArray);

		// if no search query, show all users
		if (!searchQuery) {
			displayArray = users;
		}
	}

	function showResults(resultArray) {
		showBuilders = true;
		displayArray = [];
		for (let i = 0; i < users.length; i++) {
			if (resultArray.includes(users[i].id)) {
				displayArray.push(users[i]);
			}
		}

		if (searchQuery) {
			displayArray = displayArray.filter((user) => {
				return user.name.toLowerCase().includes(searchQuery.toLowerCase());
			});
		}
	}

	function downloadAllResumes() {
		console.log('Downloading resumes...');
	}

	async function handleUserClick(user) {
		if (user.resumeURL) {
			window.open(user.resumeURL, '_blank');
		}
	}
</script>

<svelte:head>
	<title>Build18 | Builders</title>
	<meta name="description" content="Stay updated with the latest news and events from Build18" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-orange-400 to-orange-100 relative pt-20 bg-custom">
	<div class="relative z-10 max-w-6xl mx-auto px-4 py-12">
		<h1 class="text-6xl font-extrabold text-center text-orange-500 mb-4">BUILDERS</h1>

		{#if isSponsor}
			<div class="flex flex-col items-center justify-center h-full">
				<div
					class="flex flex-col items-center justify-center w-full max-w-3xl p-4 space-y-4 bg-white rounded-lg shadow-lg"
				>
					<p class="text-center pt-4">
						Thank you for sponsoring Build18! Here you can view and download resumes from our
						builders. If you have questions or requests, please email us at <a
							href="mailto:build18@ece.cmu.edu"
							class="text-orange-500">build18@ece.cmu.edu</a
						> - we'd be happy to share role postings, coordinate campus tech talks, and more!
					</p>

					<div class="flex flex-col items-center justify-center w-full space-y-4">
						<div class="flex items-center w-full">
							<input
								type="text"
								bind:value={searchQuery}
								class="flex-grow p-2 mx-1 border-orange-400 border-2 rounded-lg accent-orange-500"
								placeholder="Search..."
							/>
							<button class="bg-orange-500 p-2 rounded-md" on:click={searchBuilders}>
								<Search class="text-white" />
							</button>
						</div>

						<div class="flex flex-col items-center justify-center w-full space-y-4">
							<!-- Labels Row -->
							<div class="flex flex-row items-center justify-center w-full space-x-4 px-4">
								<label
									for="classYear"
									class="text-lg font-semibold text-orange-500 text-center w-1/3">YEAR</label
								>
								<label
									for="startDates"
									class="text-lg font-semibold text-orange-500 text-center w-1/3">START</label
								>
								<label
									for="searching"
									class="text-lg font-semibold text-orange-500 text-center w-1/3">ROLE</label
								>
							</div>

							<!-- Checkbox Columns Row -->
							<div
								class="flex flex-row items-start justify-center w-full space-x-4 ml-20 accent-orange-500"
							>
								<!-- Year Checkboxes -->
								<div id="classYear" class="flex flex-col space-y-2 w-1/3 px-4">
									<label><input type="checkbox" value="first" /> First Year</label>
									<label><input type="checkbox" value="second" /> Sophomore</label>
									<label><input type="checkbox" value="third" /> Junior</label>
									<label><input type="checkbox" value="fourth" /> Senior</label>
									<label><input type="checkbox" value="masters" /> Masters</label>
									<label><input type="checkbox" value="phd" /> Doctorate</label>
								</div>

								<!-- Start Dates Checkboxes -->
								<div id="startDates" class="flex flex-col space-y-2 w-1/3 px-4">
									<label><input type="checkbox" value="winter2024" /> Winter 2024</label>
									<label><input type="checkbox" value="spring2025" /> Spring 2025</label>
									<label><input type="checkbox" value="summer2025" /> Summer 2025</label>
									<label><input type="checkbox" value="fall2025" /> Fall 2025</label>
								</div>

								<!-- Role Checkboxes -->
								<div id="searching" class="flex flex-col space-y-2 w-1/3 px-4">
									<label><input type="checkbox" value="internship" /> Internship</label>
									<label><input type="checkbox" value="full-time" /> Full Time</label>
								</div>
							</div>
						</div>
					</div>

					<!-- By the numbers -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-12">
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
						<div class="bg-white rounded-lg shadow p-4">
							<h3 class="text-xl font-semibold text-orange-500 mb-4">School Participation</h3>
							<canvas id="schoolChart"></canvas>
						</div>
					</div>
					<button
						class="px-4 py-2 text-orange-500 font-bold bg-white outline outline-orange-500 rounded-lg my-8"
						><a href="https://build18.org/garage">See All Projects</a></button
					>
					<button
						class="px-4 py-2 text-white font-bold bg-orange-500 rounded-lg my-8"
						on:click={downloadAllResumes}><a href="/Build18-Resume-Book-2025.pdf">Download All Resumes</a></button
					>
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center h-full">
				<p class="text-center">
					Thank you for your interest in Build18! We are currently working on a way to share resumes
					with our sponsors. If you have questions or requests, please email us at <a
						href="mailto:build18@ece.cmu.edu"
						class="text-orange-500"
					>
						build18@ece.cmu.edu
					</a> - we'd be happy to share role postings, coordinate campus tech talks, and more!
				</p>

				<div class="flex justify-center mt-8">
					<a
						href="/"
						class="px-6 py-3 text-lg font-semibold text-white bg-orange-500 rounded-md transition duration-300 ease-in-out shadow-[0_0_15px_rgba(255,130,54,0.5)] hover:bg-[#ff8236] hover:text-white hover:shadow-[0_0_30px_rgba(255,130,54,0.8)]"
					>
						Return to Home
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showBuilders}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		on:click={() => (showBuilders = false)}
	>
		<div
			class="bg-white p-6 rounded-lg shadow-lg max-w-2xl max-h-[80vh] overflow-y-auto"
			on:click|stopPropagation
		>
			<h2 class="text-2xl font-extrabold mb-4 text-orange-500 text-center uppercase">
				Matched Builders
			</h2>
			<ul class="divide-y divide-gray-200">
				{#each displayArray.sort((a, b) => {
					// Sort by resume availability first, then alphabetically
					if (a.resumeURL && !b.resumeURL) return -1;
					if (!a.resumeURL && b.resumeURL) return 1;
					return a.name.localeCompare(b.name);
				}) as user}
					<li
						class="py-3 px-4 {user.resumeURL
							? 'text-orange-500 cursor-pointer hover:bg-orange-50'
							: 'text-gray-500'}"
						on:click={() => user.resumeURL && handleUserClick(user)}
					>
						{user.name}
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
	::-webkit-scrollbar {
		display: none;
	}
	html {
		scrollbar-width: none;
	}
	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
