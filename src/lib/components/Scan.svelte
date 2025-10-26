<script>
	import { onMount } from 'svelte';
	import Alert from './Alert.svelte';
	import { ScanQRCode } from '@kuiper/svelte-scan-qrcode';
	import { fade } from 'svelte/transition';
	import { auth, db } from '../firebase';
	import {
		doc,
		getDoc,
		setDoc,
		updateDoc,
		collection,
		query,
		where,
		getDocs,
		addDoc,
		runTransaction
	} from 'firebase/firestore';

	let result = '';
	let results = [];

	// check local storage for existing results
	const storedResults = localStorage.getItem('results');
	if (storedResults) {
		results = JSON.parse(storedResults);
	}

	let drinkCounts = {};
	let isProcessing = false;
	let scannerKey = 0; // Add key for scanner reset

	let alertMessage = '';
	let alertType = '';
	let recentlyScannedUser = null;

	let scanDebounceTimer;

	$: {
		drinkCounts = results.reduce((acc, resultString) => {
			const userData = JSON.parse(resultString);
			acc[userData.drink] = (acc[userData.drink] || 0) + 1;
			return acc;
		}, {});
	}

	function showAlert(message, type) {
		alertMessage = message;
		alertType = type;
		setTimeout(() => {
			alertMessage = '';
			alertType = '';
		}, 5000);
	}

	function resetScanner() {
		scannerKey += 1; // Force scanner component to remount
		result = '';
	}

	async function updateDatabase(userDocId, name) {
		try {
			await runTransaction(db, async (transaction) => {
				const userDocRef = doc(db, 'users', userDocId);
				const userDoc = await transaction.get(userDocRef);

				if (!userDoc.exists()) {
					throw new Error('Not a Builder!');
				}

				const userData = userDoc.data();
				if (!userData.verified) {
					throw new Error('Builder not on a Team!');
				}

				if (userData.demoCheckin) {
					throw new Error('Builder already checked in!');
				}

				transaction.update(userDocRef, {
					checkedIn: true,
					demoCheckin: true
				});

				const checkInTime = new Date().toISOString();
				const demoCollection = collection(db, 'checkins');
				transaction.set(doc(demoCollection), {
					user: userDocId,
					name: name,
					event: '2026 Kick-Off',
					checkInTime
				});
			});

			return true;
		} catch (error) {
			console.error('Error in transaction:', error);
			showAlert(error.message || 'Error checking in user', 'error');
			return false;
		}
	}

	function parseData(data) {
		try {
			// First, try to parse as JSON
			const parsedData = JSON.parse(data);
			return {
				id: parsedData.userId,
				firstName: parsedData.name.split(' ')[0],
				lastName: parsedData.name.split(' ')[1] || '',
				drink: parsedData.drink,
				dietaryConsiderations: parsedData.dietaryConsiderations,
				isQRCode: true
			};
		} catch (error) {
			// If JSON parsing fails, try to parse as URL parameters
			try {
				let params;
				if (data.startsWith('http')) {
					// If it's a full URL, extract the query string
					const url = new URL(data);
					params = new URLSearchParams(url.search);
				} else {
					params = new URLSearchParams(data);
				}
				const name = params.get('name').replace('_', ' ').split(' ');
				return {
					id: `url_${Date.now()}`, // Generate a unique ID for URL-based entries
					firstName: name[0],
					lastName: name[1] || '',
					drink: params.get('drink') || 'Not specified',
					dietaryConsiderations: params.get('dietaryConsiderations') || 'None',
					isQRCode: false
				};
			} catch (urlError) {
				console.error('Error parsing data:', urlError);
				return null;
			}
		}
	}

	function _onPermissionError() {
		showAlert('Please allow camera access or text Jeffery @ 678-531-8131', 'error');
	}

	async function processUserData(userData) {
		if (!userData) {
			console.log(result);
			showAlert('Invalid data format', 'error');
			resetScanner();

			// save results to local storage
			localStorage.setItem('results', JSON.stringify(results));

			// wait 3 seconds before forcing refresh page
			setTimeout(() => {
				location.reload();
			}, 1200);
			return;
		}

		if (isProcessing) {
			showAlert('Please wait for current scan to complete', 'info');
			return;
		}

		const userString = JSON.stringify(userData);
		if (results.includes(userString)) {
			showAlert('User already scanned!', 'error');
			resetScanner();

			// save results to local storage
			localStorage.setItem('results', JSON.stringify(results));

			// wait 3 seconds before forcing refresh page
			setTimeout(() => {
				location.reload();
			}, 1200);
			return;
		}

		isProcessing = true;

		try {
			if (userData.isQRCode) {
				const checkedIn = await updateDatabase(
					userData.id,
					`${userData.firstName} ${userData.lastName}`
				);
				if (!checkedIn) {
					isProcessing = false;
					resetScanner();
					return;
				}
			}

			results = [...results, userString];

			setTimeout(() => {
				recentlyScannedUser = userData;
				showAlert('Scanned successfully!', 'success');

				setTimeout(() => {
					recentlyScannedUser = null;
					isProcessing = false;
					resetScanner();
				}, 300);

				// save results to local storage
				localStorage.setItem('results', JSON.stringify(results));

				// wait 3 seconds before forcing refresh page
				setTimeout(() => {
					location.reload();
				}, 1200);
			}, 500);
		} catch (error) {
			console.error('Error processing scan:', error);
			showAlert('Error processing scan', 'error');
			isProcessing = false;
			resetScanner();
		}
	}

	async function _onResulted() {
		clearTimeout(scanDebounceTimer);
		scanDebounceTimer = setTimeout(async () => {
			const userData = parseData(result);
			await processUserData(userData);
		}, 200);
	}

	onMount(async () => {
		await handleUrlParams();
	});
</script>

<div class="min-h-screen bg-custom">
	<!-- Fixed Alert at the top -->
	{#if alertMessage}
		<div class="fixed top-0 left-0 right-0 z-50 p-4" transition:fade>
			<Alert message={alertMessage} type={alertType} class="max-w-xl mx-auto shadow-lg" />
		</div>
	{/if}

	<div class="p-4 max-w-6xl mx-auto mt-32">
		<!-- Scanner container with white background -->
		<div class="bg-white p-4 rounded-lg shadow-md mb-8">
			<div class="flex justify-center">
				<ScanQRCode
					key={scannerKey}
					class="mx-auto"
					bind:scanResult={result}
					options={{
						onPermissionError: () => _onPermissionError(),
						onResulted: () => _onResulted()
					}}
				/>
			</div>
		</div>

		<!-- Recently scanned user card -->
		{#if recentlyScannedUser}
			<div
				class="mb-8 p-6 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md"
				transition:fade
			>
				<h3 class="text-xl font-semibold text-green-800">Recently Scanned User:</h3>
				<p class="text-green-700">
					Name: {recentlyScannedUser.firstName}
					{recentlyScannedUser.lastName}
				</p>
				<p class="text-green-700">
					Dietary Considerations: {recentlyScannedUser.dietaryConsiderations}
				</p>
			</div>
		{/if}

		<!-- Scanned Users Table -->
		<div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
			<h2 class="text-3xl font-bold p-6 bg-orange-500 text-white">Scanned Users</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full table-auto">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>Name</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>Dietary</th
							>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each results as resultString}
							{@const userData = JSON.parse(resultString)}
							<tr>
								<td class="px-6 py-4 whitespace-nowrap">{userData.firstName} {userData.lastName}</td
								>
								<td class="px-6 py-4 whitespace-nowrap">{userData.drink}</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if userData.dietaryConsiderations}
										<span
											class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800"
										>
											{userData.dietaryConsiderations}
										</span>
									{:else}
										None
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Summary Card -->
		<div class="bg-white p-6 rounded-lg shadow-md mb-8">
			<h3 class="text-xl font-semibold mb-2">Summary</h3>
			<p>Total users scanned: {results.length}</p>
		</div>
	</div>
</div>

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
