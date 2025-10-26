<script>
	import { auth, db } from '../../lib/firebase';
	import { createUserWithEmailAndPassword } from 'firebase/auth';
	import { doc, setDoc } from 'firebase/firestore';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let name = '';
	let isAdmin = false;
	let error = null;

	onMount(() => {
		// Force re-render when component mounts
		email = '';
		password = '';
		name = '';
		error = null;
	});

	async function handleRegister() {
		if (!email.endsWith('cmu.edu')) {
			error = 'Please use a valid cmu.edu email.';
			return;
		}
		if (password.length < 6) {
			error = 'Password must be at least 6 characters long.';
			return;
		}
		if (name.length < 1) {
			error = 'Please enter your name.';
			return;
		}
		try {
			console.log('Registering user...');
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;
			await setDoc(doc(db, 'users', user.uid), { name, email, isAdmin, teamId: null });
			console.log('Registration successful');
			location.href = '/' + '#registered';
		} catch (err) {
			error = err.message;
		}
	}

	function goToLogin() {
		goto('/login');
	}

	function goToHome() {
		location.href = '/';
	}
</script>

<div class="container mx-auto p-4 bg-custom">
	<div class="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto mt-16">
		<h2 class="text-2xl font-semibold text-center text-[#FF8236]">Register</h2>
		<form on:submit|preventDefault={handleRegister} class="mt-4">
			<input
				type="text"
				bind:value={name}
				placeholder="Name"
				class="border p-2 w-full mb-2 rounded"
				required
			/>
			<input
				type="email"
				bind:value={email}
				placeholder="Email"
				class="border p-2 w-full mb-2 rounded"
				required
			/>
			<input
				type="password"
				bind:value={password}
				placeholder="Password"
				class="border p-2 w-full mb-2 rounded"
				required
			/>
			<button type="submit" class="bg-[#FF8236] text-white p-2 w-full rounded hover:bg-[#e57c29]"
				>Create Account</button
			>
		</form>
		{#if error}
			<p class="text-red-500 text-center mt-2">{error}</p>
		{/if}
		<div class="text-center mt-4">
			<button on:click={goToLogin} class="text-[#FF8236] hover:underline"
				>Already have an account? Login</button
			>
		</div>
		<div class="text-center mt-2">
			<button on:click={goToHome} class="text-[#FF8236] hover:underline">Back to Homepage</button>
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
