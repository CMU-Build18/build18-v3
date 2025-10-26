<!-- src/lib/components/DiscordLink.svelte -->
<script>
	import { onMount } from 'svelte';
	import { getAuth } from 'firebase/auth';
	import { doc, setDoc, getDoc, getFirestore } from 'firebase/firestore';
	import { KeyRound } from 'lucide-svelte';

	export let size = 'default';

	let isLoading = true;
	let isLinked = false;
	let discordUsername = '';

	const DISCORD_CLIENT_ID = '1322017132715966524';
	const REDIRECT_URI = 'http://build18.org/dashboard';

	const auth = getAuth();
	const db = getFirestore();

	onMount(async () => {
		// Check if user has already linked Discord
		if (auth.currentUser) {
			const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
			const userData = userDoc.data();

			if (userData?.discord?.username) {
				isLinked = true;
				discordUsername = userData.discord.username;
			}
		}

		isLoading = false;

		// Handle OAuth redirect
		const urlParams = new URLSearchParams(window.location.search);
		const fragment = new URLSearchParams(window.location.hash.slice(1));
		const accessToken = fragment.get('access_token');

		if (accessToken) {
			try {
				// Fetch user data with access token
				const userResponse = await fetch('https://discord.com/api/users/@me', {
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				});

				if (!userResponse.ok) {
					throw new Error('Failed to fetch Discord user data');
				}

				const userData = await userResponse.json();

				// Store username in Firestore
				if (auth.currentUser && userData.username) {
					discordUsername = userData.username;
					isLinked = true;

					await setDoc(
						doc(db, 'users', auth.currentUser.uid),
						{
							discord: {
								username: userData.username,
								verified: true
							}
						},
						{ merge: true }
					);
				}

				// Clear the URL fragment
				window.location.hash = '';
			} catch (error) {
				console.error('Error fetching Discord data:', error);
				alert('Failed to link Discord account');
			}
		}
	});

	function handleLinkDiscord() {
		if (!auth.currentUser) {
			alert('Please sign in first');
			return;
		}

		// Use implicit grant flow - no backend needed
		const authUrl = new URL('https://discord.com/oauth2/authorize');
		authUrl.searchParams.append('client_id', DISCORD_CLIENT_ID);
		authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
		authUrl.searchParams.append('response_type', 'token');
		authUrl.searchParams.append('scope', 'identify');

		window.location.href = authUrl.toString();
	}

	$: buttonClasses = `
	  inline-flex items-center justify-center gap-2 rounded-md mt-4 font-semibold transition-colors mt-6 py-3
	  ${size === 'large' ? 'px-6 text-lg' : 'px-4 text-sm'}
	  ${
			isLinked
				? 'font-semibold text-white bg-[#5865F2] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
				: 'font-semibold text-white bg-[#5865F2] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
		}
	`;
</script>

<button class={buttonClasses} on:click={handleLinkDiscord} disabled={isLoading}>
	<KeyRound size={size === 'large' ? 20 : 16} />
	{#if isLinked}
		Connected as {discordUsername}
	{:else}
		LINK ACCOUNT
	{/if}
</button>
