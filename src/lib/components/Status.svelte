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
	import { ThumbsUp, ThumbsDown, AlertTriangle, MessageSquare, Copy } from 'lucide-svelte';

	let currentUser;
	let isAdmin = false;

	let totalCost = 0;
	let uniqueParts = 0;
	let totalParts = 0;

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
					}
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

<div class="bg-white bg-custom">
	<div class="relative z-100">
		<div class="p-4 max-w-6xl mx-auto">
			<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">STATUS</h2>

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Home</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Garage</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Admin</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Dashboard</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Blog</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Links</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Discord</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Mobile</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-4">
					<div class="text-center">
						<span class="block text-lg font-semibold text-gray-700">Online</span>
						<span class="block text-3xl font-bold text-orange-500">Scan</span>
					</div>
				</div>
			</div>

			<!-- Home -->
			<div class="flex justify-center">
				<button
					class="bg-orange-500 text-white px-4 py-2 rounded-lg mt-4"
					on:click={() => (window.location.href = '/')}>Home</button
				>
			</div>
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
