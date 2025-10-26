<script>
	import { onMount } from 'svelte';
	let loading = true;

	onMount(() => {
		window.location.href =
			'https://docs.google.com/forms/d/e/1FAIpQLSeXWC-IMtk8jfI-7NXjSQZ7PnhLhk11r7fU96Hi9yMWwGGKAA/viewform';

		setTimeout(() => {
			loading = false;
		}, 3000); // Show loading for 3 seconds
	});

	const handleManualRedirect = () => {
		window.location.href =
			'https://docs.google.com/forms/d/e/1FAIpQLSeXWC-IMtk8jfI-7NXjSQZ7PnhLhk11r7fU96Hi9yMWwGGKAA/viewform';
	};
</script>

<div class="min-h-screen bg-gradient-to-b from-orange-400 to-orange-100 relative pt-20 bg-custom">
	<div class="relative z-10 max-w-6xl mx-auto px-4 py-12 text-center">
		{#if loading}
			<div class="animate-pulse space-y-4">
				<div class="h-4 bg-orange-200 rounded w-3/4 mx-auto" />
				<div class="h-4 bg-orange-200 rounded w-1/2 mx-auto" />
			</div>
		{:else}
			<p class="mb-4">Please click the button below if not redirected automatically...</p>
			<button
				on:click={handleManualRedirect}
				class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
			>
				Go to Form
			</button>
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
