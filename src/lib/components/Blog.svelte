<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Mail, Home, Instagram, Smartphone } from 'lucide-svelte';

	const posts = [
		{
			title: 'Tech Talk - Intro to Microcontrollers',
			date: '2025-09-30',
			image: '/blog/015.jpg',
			link: 'https://docs.google.com/presentation/d/1Lm6hQ5rzCk0ZW8Tc9uo3jVXA7GrzxDrd/edit?usp=sharing&ouid=107111862973674727330&rtpof=true&sd=true',
			description:
				'Learn how to use Arduino, STM32, and Raspberry PI to build projects for the hackathon! <br> Access the slides <a href="https://docs.google.com/presentation/d/1Lm6hQ5rzCk0ZW8Tc9uo3jVXA7GrzxDrd/edit?usp=sharing&ouid=107111862973674727330&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" style="font-weight: bold; text-decoration: underline; color: orange;">HERE</a>'
		},
		{
			title: '2026 Kickoff!',
			date: '2025-09-09',
			image: '/blog/014.jpg',
			link: 'https://www.instagram.com/p/DOMCarGjvGk/',
			description:
				'Join us next Friday, Sep. 12, from 4-5 pm in Singleton for the Build 18 Kickoff!! Learn about the Hardware Hackathon and how you can participate! Pizza will also be provided 🍕'
		},
		{
			title: 'Speed Recruiting with Astera Labs!',
			date: '2025-09-06',
			image: '/blog/013.jpg',
			link: 'https://www.instagram.com/p/DOO0ZASEjOD/',
			description:
				'AsteraLabs + Build18 Recruitment Event!🚀 Start the semester strong with our first event!'
		},
		{
			title: 'Tech Talk - PCB Design',
			date: '2024-11-21',
			image: '/blog/009.jpg',
			link: 'https://forms.gle/S7N9UerZp8dhCZEE9',
			description:
				'Join us for a PCB Design Workshop on 11/21 from 5-6PM in HH 1207! RSVP link in Dashboard 🤖'
		},
		{
			title: 'Team Matching on Friday!',
			date: '2024-10-01',
			image: '/blog/012.jpg',
			link: '',
			description:
				"Join Us for the Build18 team Matching Event THIS FRIDAY! Connect with fellow builders and form your 2025 Build18 teams! Whether you have a project idea or are looking to join a team, this event is the perfect opportunity to get started. Boba will be provided, but you MUST RSVP to enjoy this delicious treat! Make sure to secure your spot by registering through the dashboard. Got questions? Feel free to email us at build18@ece.cmu.edu. We can't wait to see you there!"
		},
		{
			title: 'Tech Talk - Optiver',
			date: '2024-09-23',
			image: '/blog/010.jpg',
			link: '',
			description:
				'Our first workshop will be this Thursday, 9/26 in HH 1207 from 5-6:30PM. Register for an account and RSVP in the dashboard!'
		},
		{
			title: 'Build18 2025: Kickoff',
			date: '2024-09-13',
			image: '/blog/002.jpg',
			link: '',
			description:
				"Get ready for Build18 2025! Join us for the kickoff event where we'll walk you through our dashboard!"
		},
		{
			title: 'Build18 2024: Photos!',
			date: '2024',
			image: '/blog/001.jpg',
			link: '',
			description:
				'Relive the memories of Build18 2024 through our photo gallery. See the <a class="text-orange-500 hover:text-orange-600 underline" href="https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335">amazing projects</a> and the brilliant minds behind them.'
		}
	];

	const events = [
		{
			title: 'Track 2 Deadline',
			date: '2025-10-20',
			time: 'Midnight',
			location: 'Dashboard',
			content:
				'Make sure to submit in Dashboard by 10/20 to be considered for an ambitious project 🤖'
		},
		{
			title: 'Track 1 Deadline',
			date: '2024-10-24',
			time: 'Midnight',
			location: 'Dashboard',
			content:
				'Make sure to submit in Dashboard by 10/24 to be considered for a standard project 👀'
		},
		{
			title: 'Tech Talk - CAD',
			date: '2025-10-30',
			content: 'Come join us to learn about CAD, 3D Printing, and Laser Cutting!'
		},
		{
			title: '2026 Parts List Deadline',
			date: '2025-11-17',
			time: 'Midnight',
			location: 'Dashboard',
			content: 'Sign your builder contract and finalize your parts list!'
		}
	];

	const pastEvents = [
		{
			title: 'Team Registration Deadline',
			date: '2025-10-12',
			time: 'Midnight',
			location: 'Dashboard',
			content: 'Make sure to create your account and join your team in the Dashboard by 10/12 ‼️'
		},
		{
			title: 'Team Matching',
			date: '2025-10-03',
			time: '4:30 PM - 6:30 PM',
			location: 'Scott Hall'
		},
		{
			title: 'Tech Talk - Microcontrollers',
			date: '2025-09-30',
			time: '5:00 PM - 6:00 PM',
			location: 'Doherty Hall'
		},
		{
			title: '2026 Kickoff',
			date: '2025-09-12',
			time: '4PM - 5PM',
			location: 'Singleton Hall',
			content: 'Join us for the Build18 Kickoff to learn about the Hardware Hackathon!'
		}
	];

	let selectedPost = null;
	let showModal = false;
	let loading = true;

	function openModal(post) {
		selectedPost = post;
		showModal = true;
		document.body.style.overflow = 'hidden';
	}

	function closeModal() {
		showModal = false;
		document.body.style.overflow = 'auto';
	}

	let currentFilter = 'all';

	$: filteredPosts =
		currentFilter === 'all'
			? posts
			: posts.filter((post) => {
					const postDate = new Date(post.date);
					const currentDate = new Date();
					const oneMonthAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
					return postDate >= oneMonthAgo;
				});

	function handleKeydown(event, post) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openModal(post);
		}
	}

	let searchTerm = '';
	$: searchResults = filteredPosts.filter(
		(post) =>
			post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			post.description.toLowerCase().includes(searchTerm.toLowerCase())
	);

	onMount(() => {
		loading = false;
	});
</script>

<svelte:head>
	<title>Build18 | Updates</title>
	<meta name="description" content="Stay updated with the latest news and events from Build18" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-orange-400 to-orange-100 relative pt-20 bg-custom">
	<div class="relative z-10 max-w-6xl mx-auto px-4 py-12">
		<h1 class="text-6xl font-extrabold text-center text-orange-500 mb-12">BUILD18 UPDATES</h1>

		<div class="grid md:grid-cols-2 gap-8">
			<!-- Blog Section -->
			<section>
				<h2 class="text-4xl font-bold mb-8 text-orange-500">Latest News</h2>
				<div class="space-y-8">
					{#if loading}
						{#each Array(3) as _}
							<div
								class="bg-white bg-opacity-80 rounded-xl shadow-lg overflow-hidden animate-pulse"
							>
								<div class="h-48 bg-gray-300"></div>
								<div class="p-4 space-y-4">
									<div class="h-6 bg-gray-300 rounded w-3/4"></div>
									<div class="h-4 bg-gray-300 rounded w-1/2"></div>
								</div>
							</div>
						{/each}
					{:else}
						{#each posts as post}
							<div
								in:fly={{ y: 50, duration: 500 }}
								class="bg-white bg-opacity-80 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer"
								role="button"
								tabindex="0"
								on:click={() => openModal(post)}
								on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? openModal(post) : null}
							>
								<img src={post.image} alt={post.title} class="w-full h-48 object-cover" />
								<div class="p-6">
									<h3 class="text-2xl font-bold text-gray-800 mb-2">{post.title}</h3>
									<p class="text-gray-600 mb-4">{post.date}</p>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</section>

			<!-- Events Section -->
			<section class="pl-16">
				<h2 class="text-4xl font-bold mb-8 text-orange-500">Upcoming Events</h2>
				<div class="space-y-6">
					{#each events as event}
						<div
							in:fly={{ x: 50, duration: 500 }}
							class="bg-white bg-opacity-80 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
						>
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-2xl font-bold text-orange-500">{event.title}</h3>
								<span class="text-gray-600">{event.date}</span>
							</div>
							{#if event.time}
								<p class="text-gray-700">
									<span class="font-semibold">Time:</span>
									{event.time}
								</p>
							{/if}
							{#if event.location}
								<p class="text-gray-700">
									<span class="font-semibold">Location:</span>
									{event.location}
								</p>
							{/if}
							<p class="text-gray-700">{event.content}</p>
						</div>
					{/each}
				</div>
				<!-- <h2 class="text-4xl font-bold mb-8 text-orange-500 pt-12">Past Events</h2> -->
				<div class="space-y-6 opacity-50">
					{#each pastEvents as event}
						<div
							in:fly={{ x: 50, duration: 500 }}
							class="bg-white bg-opacity-80 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
						>
							<div
								class="flex items
							-center justify-between mb-4"
							>
								<h3 class="text-2xl font-bold text-orange-500">{event.title}</h3>
								<span class="text-gray-600">{event.date}</span>
							</div>
							{#if event.time}
								<p class="text-gray-700">
									<span class="font-semibold">Time:</span>
									{event.time}
								</p>
							{/if}
							{#if event.location}
								<p class="text-gray-700">
									<span class="font-semibold">Location:</span>
									{event.location}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		</div>

		<!-- Button to go back to home -->
		<div class="text-center mt-16">
			<a
				href="https://build18.org"
				class="px-4 py-2 text-lg font-bold text-white bg-[#ff8236] rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
			>
				Back to Home
			</a>
		</div>

		<!-- Social Media Links -->
		<div class="mt-4 text-center">
			<div class="flex justify-center space-x-6">
				<a
					href="https://build18.org"
					class="text-orange-500 hover:text-orange-200 transition-colors"
				>
					<Home size="24" stroke-width="2" class="lucide lucide-home" />
				</a>
				<a
					href="https://instagram.com/build.18"
					class="text-orange-500 hover:text-orange-200 transition-colors"
				>
					<Instagram size="24" stroke-width="2" class="lucide lucide-instagram" />
				</a>
				<a
					href="mailto:build18@ece.cmu.edu"
					class="text-orange-500 hover:text-orange-200 transition-colors"
				>
					<Mail size="24" stroke-width="2" class="lucide lucide-mail" />
				</a>
				<a
					href="https://build18.org/toolbox"
					class="text-orange-500 hover:text-orange-200 transition-colors"
				>
					<Smartphone size="24" stroke-width="2" class="lucide lucide-mail" />
				</a>
			</div>
		</div>
	</div>
</div>

{#if showModal}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Escape' ? closeModal() : null}
	>
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="bg-white rounded-xl w-full max-w-4xl p-8 relative my-8"
			role="document"
			on:click|stopPropagation
			on:keydown|stopPropagation
			in:fly={{ y: -50, duration: 300 }}
		>
			<button
				on:click={closeModal}
				class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
				aria-label="Close modal"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
			<article class="prose prose-lg max-w-none">
				<h2 class="text-3xl font-bold mb-4 text-orange-500">{selectedPost.title}</h2>
				<p class="text-gray-600 mb-4">{selectedPost.date}</p>
				<img
					src={selectedPost.image}
					alt={selectedPost.title}
					class="w-full h-64 object-cover rounded-lg mb-6"
				/>
				<div class="text-gray-700 text-lg leading-relaxed">
					{@html selectedPost.description}
				</div>
			</article>
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
