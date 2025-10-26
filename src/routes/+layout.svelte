<!-- src/routes/+layout.svelte -->
<script>
	import '../app.css';
	import { auth, db } from '$lib/firebase';
	import { onMount } from 'svelte';
	import { doc, getDoc } from 'firebase/firestore';
	import { signOut } from 'firebase/auth';
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	import {
		House,
		Warehouse,
		MessageSquare,
		LayoutPanelLeft,
		Settings,
		LogOut
	} from 'lucide-svelte';

	inject({ mode: dev ? 'development' : 'production' });

	export let user = null;
	export let isAdmin = false;
	export let isLoading = true;

	let currentPath = '';

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			isLoading = true;
			if (currentUser) {
				user = currentUser;
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					isAdmin = userDoc.data().isAdmin || false;
				} else {
					console.error('User document does not exist');
					await signOut(auth);
				}
			} else {
				user = null;
				isAdmin = false;
			}
			isLoading = false;
		});

		// if url param is '#loggedin', navigate to the dashboard
		if (location.hash === '#loggedin' || location.hash === '#registered') {
			window.location.href = '/dashboard';
		}

		currentPath = window.location.pathname;

		return unsubscribe;
	});

	$: isAdmin = user && isAdmin;
	$: isLoading = isLoading;

	let scrollY = 0;
	let prevScrollY = 0;
	let isVisible = true;
	const buffer = 3;

	function handleScroll() {
		isVisible = scrollY < prevScrollY + buffer || scrollY === 0;
		prevScrollY = scrollY;
	}

	function goToAdmin() {
		window.location.href = '/admin';
	}

	function goToDashboard() {
		window.location.href = '/dashboard';
	}

	async function handleLogout() {
		try {
			await signOut(auth);
			window.location.href = '/';
		} catch (error) {
			console.error('Error signing out: ', error);
		}
	}
</script>

<svelte:window bind:scrollY on:scroll={handleScroll} />

<main class="flex-grow pt">
	{#if isLoading}
		<div class="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
			<div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#FF8236]"></div>
		</div>
	{:else}
		<div class="flex flex-col">
			<header
				class="fixed top-0 left-0 right-0 z-50 px-4 pb-12 transition-transform duration-300 {isVisible
					? ''
					: '-translate-y-full'}"
			>
				<nav class="flex justify-center">
					<ul
						class="flex justify-center items-center space-x-8 bg-white rounded-full shadow-lg p-4"
					>
						<li id="navHome" class="flex items-center justify-center pl-2">
							<a href="https://build18.org" class="nav-link">
								<House size="24" />
							</a>
						</li>
						<li id="navGarage" class="flex items-center justify-center">
							<a href="/garage" class="nav-link">
								<Warehouse size="24" />
							</a>
						</li>
						<li id="navBlog" class="flex items-center justify-center">
							<a href="/blog" class="nav-link">
								<MessageSquare size="24" />
							</a>
						</li>
						{#if user}
							<li id="navDashboard" class="flex items-center justify-center">
								<button on:click={goToDashboard} class="nav-link">
									<LayoutPanelLeft size="24" />
								</button>
							</li>
							{#if isAdmin}
								<li id="navAdmin" class="flex items-center justify-center">
									<button on:click={goToAdmin} class="nav-link">
										<Settings size="24" />
									</button>
								</li>
							{/if}
							<li id="navLogout" class="flex items-center justify-center">
								<button on:click={handleLogout} class="nav-button">
									<LogOut size="22" />
								</button>
							</li>
						{:else}
							<li class="flex items-center justify-center">
								<a
									href="/register"
									class="nav-button bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transform hover:scale-105 transition duration-300 ease-in-out animate-pulse"
								>
									<span class="text-shadow-glow"><p class="text-white">REGISTER!</p></span>
								</a>
							</li>
						{/if}
					</ul>
				</nav>
			</header>
		</div>
		<slot />
	{/if}
</main>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}

	.nav-link {
		@apply text-gray-700 hover:text-[#FF8236] transition-colors duration-200;
	}

	.nav-button {
		@apply px-4 py-2 rounded-full border-2 border-[#FF8236] text-[#FF8236] hover:bg-[#FF8236] hover:text-white transition-colors duration-200;
	}

	/* Remove excess overflow on mobile */
	@media (max-width: 640px) {
		:global(body) {
			overflow-x: hidden;
		}
	}
</style>
