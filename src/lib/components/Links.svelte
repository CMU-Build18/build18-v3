<script>
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	const links = [
		{
			name: '25-26 Discord Server',
			href: 'https://discord.gg/2g3tWECHJ3',
			icon: 'links/discord-link.svg'
		},
		{
			name: 'Website & Dashboard',
			href: 'https://build18.org',
			icon: 'links/link-link.svg'
		},
		{
			name: 'Event Calendar',
			href: 'https://calendar.google.com/calendar/embed?src=c_238a1c84db158b866743afdeb12a4d2b6a8f3e8fc097461e27706ea2e328c0d7%40group.calendar.google.com&ctz=America%2FNew_York',
			icon: 'links/calendar-link.svg'
		},
		{
			name: 'Instagram',
			href: 'https://www.instagram.com/build.18/',
			icon: 'links/instagram-link.svg'
		},
		{
			name: 'LinkedIn',
			href: 'https://www.linkedin.com/company/build18/',
			icon: 'links/linkedin-link.svg'
		}
	];

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

<div
	class="min-h-screen bg-gradient-to-b from-orange-400 to-orange-600 p-4 sm:p-6 md:p-8 relative overflow-hidden"
>
	<!-- Circuit Board Background -->
	<div class="absolute inset-0 opacity-20 pointer-events-none">
		<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
			<defs>
				<pattern
					id="circuit-pattern"
					x="0"
					y="0"
					width="100"
					height="100"
					patternUnits="userSpaceOnUse"
				>
					<path
						d="M10 10 H90 M10 90 H90 M10 10 V90 M90 10 V90"
						stroke="white"
						stroke-width="0.5"
						fill="none"
					/>
					<circle cx="10" cy="10" r="2" fill="white" />
					<circle cx="90" cy="10" r="2" fill="white" />
					<circle cx="10" cy="90" r="2" fill="white" />
					<circle cx="90" cy="90" r="2" fill="white" />
				</pattern>
			</defs>
			<rect x="0" y="0" width="100%" height="100%" fill="url(#circuit-pattern)" />
		</svg>
	</div>

	<!-- Traveling Circuit Lines -->
	<svg
		class="absolute inset-0 w-full h-full pointer-events-none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M0 25% H100%" class="stroke-white opacity-30 animate-circuit" />
		<path
			d="M0 50% H100%"
			class="stroke-white opacity-30 animate-circuit"
			style="animation-delay: -5s;"
		/>
		<path
			d="M0 75% H100%"
			class="stroke-white opacity-30 animate-circuit"
			style="animation-delay: -10s;"
		/>
		<path
			d="M25% 0 V100%"
			class="stroke-white opacity-30 animate-circuit"
			style="animation-delay: -2s;"
		/>
		<path
			d="M50% 0 V100%"
			class="stroke-white opacity-30 animate-circuit"
			style="animation-delay: -7s;"
		/>
		<path
			d="M75% 0 V100%"
			class="stroke-white opacity-30 animate-circuit"
			style="animation-delay: -12s;"
		/>
	</svg>

	<div class="max-w-md mx-auto relative">
		<header class="text-center">
			<div class="relative inline-block">
				<img src="/logo-outline.png" alt="Build18 Logo" class="w-72 h-72 mx-auto rounded-full" />
			</div>
		</header>

		<nav class="flex justify-center space-x-4 mb-8" in:fly={{ y: 20, duration: 500, delay: 600 }}>
			{#each links as link}
				<a
					href={link.href}
					target="_blank"
					rel="noopener noreferrer"
					class="text-white hover:text-orange-200 transition-colors transform hover:scale-110"
				>
					<img src={link.icon} alt={link.name} class="w-8 h-8" />
				</a>
			{/each}
		</nav>

		<div class="space-y-4">
			{#each links as link, index}
				{#if mounted}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="block bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4 text-white hover:bg-opacity-30 transition-all transform hover:scale-105 shadow-md relative overflow-hidden"
						in:fly={{ y: 20, duration: 500, delay: 800 + index * 100 }}
					>
						<div class="flex items-center justify-center space-x-4 relative z-10">
							<span class="text-lg font-semibold text-center">{link.name}</span>
						</div>
					</a>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	@keyframes circuit-travel {
		0% {
			stroke-dashoffset: 1000px;
		}
		100% {
			stroke-dashoffset: 0px;
		}
	}

	.animate-circuit {
		stroke-dasharray: 1000px;
		stroke-dashoffset: 1000px;
		animation: circuit-travel 5s linear infinite;
	}

	.stroke-white {
		stroke: white;
		stroke-width: 2;
		fill: none;
	}

	/* Glowing effect for circuit lines */
	.stroke-white {
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.7));
	}
</style>
