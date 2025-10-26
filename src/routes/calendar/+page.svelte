<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

	let currentUser = null;
	let calendarEvents = [];
	let loading = true;

	// Function to check if an event is in the past
	function isEventPast(eventDate, eventTime) {
		const now = new Date();
		const eventDateTime = new Date(`${eventDate}T${eventTime}`);
		return eventDateTime < now;
	}

	// Function to format date for display
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Function to format time for display
	function formatTime(timeString) {
		const [hour, minute] = timeString.split(':');
		const date = new Date();
		date.setHours(parseInt(hour), parseInt(minute));
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	onMount(async () => {
		try {
			// Set up auth listener
			const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
				if (user) {
					currentUser = user;
					loading = false;

					// Set up real-time listener for calendar events
					const calendarEventsQuery = query(collection(db, 'calendar'), orderBy('date', 'asc'));

					const unsubscribeCalendar = onSnapshot(calendarEventsQuery, (snapshot) => {
						calendarEvents = snapshot.docs.map((doc) => ({
							id: doc.id,
							...doc.data(),
							timestamp: doc.data().timestamp.toDate().toLocaleString()
						}));
					});

					// Return cleanup function for calendar subscription
					return () => {
						unsubscribeCalendar();
					};
				} else {
					loading = false;
				}
			});

			// Return cleanup function for auth subscription
			return () => {
				unsubscribeAuth();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
			loading = false;
		}
	});
</script>

<div class="bg-white bg-custom min-h-screen">
	<div class="relative z-10">
		<div class="p-4 max-w-6xl mx-auto">
			<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28">CALENDAR</h2>

			{#if loading}
				<div class="text-center py-8">
					<p class="text-gray-500">Loading calendar events...</p>
				</div>
			{:else if !currentUser}
				<div class="text-center py-8">
					<p class="text-gray-700 mb-4">Please login to view the calendar.</p>
					<button
						class="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
						onclick={() => (window.location.href = '/')}
					>
						Return Home
					</button>
				</div>
			{:else}
				<!-- Calendar Events -->
				<div class="mb-8">
					{#if calendarEvents.length === 0}
						<div class="text-center py-8">
							<p class="text-gray-500">No calendar events scheduled yet.</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{#each calendarEvents as event}
								{@const isPast = isEventPast(event.date, event.time)}
								<div
									class="bg-white p-6 rounded-lg shadow-md border-l-4 {isPast
										? 'border-gray-400 opacity-60'
										: 'border-orange-500'} transition-all duration-200 hover:shadow-lg"
								>
									<div class="mb-4">
										<h3
											class="text-xl font-bold {isPast ? 'text-gray-500' : 'text-orange-500'} mb-2"
										>
											{event.title}
											{#if isPast}
												<span class="text-sm font-normal text-gray-400 ml-2">(Past Event)</span>
											{/if}
										</h3>
										<p class="text-gray-700 mb-3 leading-relaxed">{event.description}</p>
									</div>

									<div class="space-y-2 text-sm">
										<div class="flex items-center {isPast ? 'text-gray-500' : 'text-gray-700'}">
											<svg
												class="w-4 h-4 mr-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												></path>
											</svg>
											<span class="font-medium">Date:</span>
											<span class="ml-1">{formatDate(event.date)}</span>
										</div>

										<div class="flex items-center {isPast ? 'text-gray-500' : 'text-gray-700'}">
											<svg
												class="w-4 h-4 mr-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												></path>
											</svg>
											<span class="font-medium">Time:</span>
											<span class="ml-1">{formatTime(event.time)}</span>
										</div>

										<div class="flex items-center {isPast ? 'text-gray-500' : 'text-gray-700'}">
											<svg
												class="w-4 h-4 mr-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
												></path>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
												></path>
											</svg>
											<span class="font-medium">Location:</span>
											<span class="ml-1">{event.location}</span>
										</div>
									</div>

									<div class="mt-4 pt-4 border-t border-gray-200">
										<p class="text-xs {isPast ? 'text-gray-400' : 'text-gray-500'}">
											Created by {event.author} • {event.timestamp}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Navigation Button -->
				<div class="text-center mt-8">
					<button
						class="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
						onclick={() => (window.location.href = '/')}
					>
						Return Home
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

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
