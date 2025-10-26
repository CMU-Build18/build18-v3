<!-- // src/routes/blog/[slug]/+page.svelte -->
<script>
	import { onMount } from 'svelte';

	export let data;

	const posts = [
		{
			title: 'Team Matching on Friday!',
			date: '2024-10-01',
			image: '/blog/005.jpg',
			slug: 'team-matching-friday',
			description:
				"Join Us for the Build18 team Matching Event THIS FRIDAY! Connect with fellow builders and form your 2025 Build18 teams! Whether you have a project idea or are looking to join a team, this event is the perfect opportunity to get started. Boba will be provided, but you MUST RSVP to enjoy this delicious treat! Make sure to secure your spot by registering through the dashboard. Got questions? Feel free to email us at build18@ece.cmu.edu. We can't wait to see you there!"
		},
		{
			title: 'First Tech Talk!',
			date: '2024-09-23',
			image: '/blog/006.png',
			slug: 'first-tech-talk',
			description:
				'Our first workshop will be this Thursday, 9/26 in HH 1207 from 5-6:30PM. Register for an account and RSVP in the dashboard!'
		},
		{
			title: 'Build18 2025: Kickoff!',
			date: '2024-09-13',
			image: '/blog/002.jpg',
			slug: 'build18-2025-kickoff',
			description:
				"Get ready for Build18 2025! Join us for the kickoff event where we'll walk you through our dashboard!"
		},
		{
			title: 'Build18 2024: Photos!',
			date: '2024',
			image: '/blog/001.jpg',
			slug: 'build18-2024-photos',
			description:
				'Relive the memories of Build18 2024 through our photo gallery. See the <a class="text-[#ff8236]" href="https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335">amazing projects</a> and the brilliant minds behind them.'
		}
	];

	let post;
	let loading = true;

	onMount(() => {
		post = posts.find(p => p.slug === data.slug);
		loading = false;
	});
</script>

<div class="bg-white bg-custom">
	<section class="max-w-2xl mx-auto pt-6 px-4 relative z-10 pb-20">
		{#if loading}
			<div class="animate-pulse">
				<div class="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
				<div class="h-64 bg-gray-300 rounded mb-4"></div>
				<div class="h-4 bg-gray-300 rounded w-full mb-2"></div>
				<div class="h-4 bg-gray-300 rounded w-5/6"></div>
			</div>
		{:else if post}
			<h2 class="text-4xl font-bold mb-4 text-[#ff8236]">{post.title}</h2>
			<p class="text-gray-500 mb-4">{post.date}</p>
			<img
				src={post.image}
				alt={post.title}
				class="w-full h-64 object-cover rounded-lg mb-4"
			/>
			<p class="text-gray-700 text-justify">{@html post.description}</p>
			<a href="https://build18.org/blog" class="inline-block mt-6 text-[#ff8236] hover:underline">← Back to Blog</a>
		{:else}
			<p class="text-2xl text-gray-700">Post not found</p>
			<a href="https://build18.org/blog" class="inline-block mt-6 text-[#ff8236] hover:underline">← Back to Blog</a>
		{/if}
	</section>
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
