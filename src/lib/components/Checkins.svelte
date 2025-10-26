<script>
	import { onMount } from 'svelte';
	import { db } from '../firebase';
	import { collection, getDocs } from 'firebase/firestore';
	import Chart from 'chart.js/auto';

	let checkins = [];
	let loading = true;
	let error = null;
	let duplicates = new Set();
	let chartData = [];
	let chart;

	function processCheckins(checkinsData) {
		const userCounts = {};
		const timeCounts = {};

		checkinsData.forEach((checkin) => {
			if (userCounts[checkin.user]) {
				userCounts[checkin.user]++;
				duplicates.add(checkin.user);
			} else {
				userCounts[checkin.user] = 1;
			}

			// change event to 'Midnight Cookies'
			if (checkin.event === 'astera') {
				checkin.event = 'Midnight Cookies';
			}

			const date = new Date(checkin.checkInTime).toLocaleDateString();
			if (timeCounts[date]) {
				timeCounts[date]++;
			} else {
				timeCounts[date] = 1;
			}
		});


		chartData = Object.entries(timeCounts).map(([date, count]) => ({ date, count }));
	}

	function createChart() {
		const ctx = document.getElementById('duplicateChart');
		if (chart) chart.destroy(); // Destroy previous chart if it exists
		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: chartData.map((d) => d.date),
				datasets: [
					{
						label: 'Number of Check-ins',
						data: chartData.map((d) => d.count),
						backgroundColor: 'rgba(75, 192, 192, 0.6)',
						borderColor: 'rgba(75, 192, 192, 1)',
						borderWidth: 1,
						fill: false
					}
				]
			},
			options: {
				responsive: true,
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							stepSize: 1
						}
					}
				}
			}
		});
	}

	onMount(async () => {
		try {
			const checkinsSnapshot = await getDocs(collection(db, 'astera'));
			const checkinsData = checkinsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			processCheckins(checkinsData);
			checkins = checkinsData;
			loading = false;

			// Create chart after data is processed
			setTimeout(createChart, 0);
		} catch (err) {
			console.error('Error fetching data:', err);
			error = 'An error occurred while fetching data. Please try again later.';
			loading = false;
		}
	});
</script>

<div class="p-4 max-w-6xl mx-auto pt-32">
	<h2 class="text-3xl font-bold mb-4">Checked-in Users</h2>

	{#if loading}
		<p class="text-gray-600">Loading...</p>
	{:else if error}
		<p class="text-red-500">{error}</p>
	{:else}
		<div class="mb-8">
			<h3 class="text-xl font-bold mb-2">Duplicate Check-ins</h3>
			<div class="w-full h-64">
				<canvas id="duplicateChart"></canvas>
			</div>
		</div>

		<div class="overflow-x-auto bg-white shadow-md rounded-lg">
			<table class="min-w-full table-auto">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Name</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>User ID</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Event</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Check-in Time</th
						>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each checkins as checkin}
						<tr class={duplicates.has(checkin.user) ? 'bg-yellow-100' : ''}>
							<td class="px-6 py-4 whitespace-nowrap">{checkin.name}</td>
							<td class="px-6 py-4 whitespace-nowrap">{checkin.user}</td>
							<td class="px-6 py-4 whitespace-nowrap">{checkin.event}</td>
							<td class="px-6 py-4 whitespace-nowrap"
								>{new Date(checkin.checkInTime).toLocaleString()}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<a href="https://build18.org" class="block mt-8">
		<div
			class="bg-orange-500 text-white font-semibold rounded-lg shadow p-4 text-center hover:bg-orange-600 transition-colors"
		>
			Return
		</div>
	</a>
</div>
