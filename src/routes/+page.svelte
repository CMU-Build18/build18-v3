<!-- src/routes/+page.svelte -->
<script>
	import Landing from '../lib/components/Landing.svelte';
	import About from '../lib/components/About.svelte';
	import FAQ from '../lib/components/FAQ.svelte';
	import Team from '../lib/components/Team.svelte';
	import Sponsors from '../lib/components/Sponsors.svelte';
	import { auth, db } from '../lib/firebase';
	import { onMount } from 'svelte';
	import { doc, getDoc } from 'firebase/firestore';
	import { signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let user = null;
	let isAdmin = false;
	let isLoading = true;
 
	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			isLoading = true;
			console.log('User:', currentUser);
			if (currentUser) {
				user = currentUser;
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					isAdmin = userDoc.data().isAdmin || false;
				} else {
					console.error('User document does not exist');
				}

				if (user.emailVerified == undefined) {
					updateDoc(doc(db, 'users', user.uid), { emailVerified: false });
				}
				// if (user && user.emailVerified) {
				// 	updateDoc(doc(db, 'users', user.uid), { emailVerified: true });
				// }

				// if user has a team, add team data to user object
				if (userDoc.data().teamId != undefined) {
					const teamDoc = await getDoc(doc(db, 'teams', userDoc.data().teamId));
					if (teamDoc.exists()) {
						user.teamName = teamDoc.data().name;
					} else {
						//console.error('Team document does not exist');
					}
				}
			} else {
				user = null;
				isAdmin = false;
			}
			isLoading = false;
		});

		// if url param is '#loggedin', navigate to the dashboard
		if (location.hash === '#loggedin' || location.hash === '#registered') {
			goto('/dashboard');
		}

		return unsubscribe;
	});

	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (error) {
			console.error('Error signing out: ', error);
		}
	}

	function goToAdmin() {
		goto('/admin');
	}

	function goToDashboard() {
		goto('/dashboard');
	}

	function scrollTo(id) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}

	let scrollY = 0;
	let prevScrollY = 0;
	let isVisible = true;
	const buffer = 3;

	function handleScroll() {
		isVisible = scrollY < prevScrollY + buffer || scrollY === 0;
		prevScrollY = scrollY;
	}
</script>

<svelte:window bind:scrollY on:scroll={handleScroll} />

<div class="flex flex-col min-h-screen">
	<main class="flex-grow">
		{#if isLoading}
			<div class="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
				<div
					class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#FF8236]"
				></div>
			</div>
		{:else}
			<Landing />
			<About />
			<FAQ />
			<Team />
			<Sponsors />
		{/if}
	</main>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
