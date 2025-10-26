<script>
	import { onMount } from 'svelte';
	import { db, auth } from '../firebase';
	import { collection, addDoc } from 'firebase/firestore';

	let userId = '';
	let eventExperience = '';
	let feedback = '';
	let favoriteOrganizer = '';
	let message = '';

	let organizers = [
		'Bill Nace',
		'Jeff Kim',
		'Michelle Heo',
		'MM Demangone',
		'Nicole Feng',
		'Perrin Tong',
		'Quinn Roberts',
		'Sebastian Perez',
		'Siddarth Singh',
		'Siena Lee',
		'Varun Kumar',
		'Jeffery John'
	];
	organizers = organizers.sort(() => Math.random() - 0.5);

	// Get the current user ID
	onMount(() => {
		auth.onAuthStateChanged((user) => {
			if (user) {
				userId = user.uid;
			} else {
				userId = 'anonymous';
			}
		});
	});

	// Handle form submission
	const submitSurvey = async () => {
		try {
			await addDoc(collection(db, 'surveys'), {
				userId,
				eventExperience: eventExperience || null,
				feedback: feedback || null,
				favoriteOrganizer: favoriteOrganizer || null,
				submittedAt: new Date()
			});
			message = 'Survey submitted!';
			eventExperience = '';
			feedback = '';
			favoriteOrganizer = '';
		} catch (error) {
			console.error('Error submitting survey:', error);
			message = 'Failed to submit the survey. Please try again or login.';
		}
	};
</script>

<div class="pt-8 bg-custom min-h-screen flex flex-col items-center justify-center">
	<div class="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
		<h1 class="text-3xl font-extrabold mb-4 text-center" style="color: #FF8236;">
			BUILD18 FEEDBACK
		</h1>
		<form on:submit|preventDefault={submitSurvey} class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 pt-4" for="eventExperience"
					>How have things been so far? What went well?</label
				>
				<textarea
					id="eventExperience"
					class="mt-1 p-2 block w-full border-gray-500 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm accent-orange-200"
					rows="3"
					bind:value={eventExperience}
				></textarea>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 pt-3" for="favoriteOrganizer"
					>Which organizer would win in a battle royale?</label
				>
				<select
					id="favoriteOrganizer"
					class="mt-3 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
					bind:value={favoriteOrganizer}
				>
					<option value="">Select an organizer</option>
					{#each organizers as organizer}
						<option value={organizer}>{organizer}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 pt-4" for="feedback"
					>Any feature requests?</label
				>
				<textarea
					id="feedback"
					class="mt-1 p-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
					rows="3"
					bind:value={feedback}
				></textarea>
			</div>

			<button
				type="submit"
				class="w-full bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600"
				style="background-color: #FF8236;"
			>
				SUBMIT
			</button>
		</form>
		{#if message}
			<p class="text-center mt-4 text-sm font-medium" style="color: #FF8236;">{message}</p>
		{/if}
	</div>
</div>

<style>
	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
