<script>
	import { auth } from '../../lib/firebase';
	import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let email = '';
	let password = '';
	let error = null;
	let successMessage = '';
	let isLoading = false;

	onMount(() => {
		// Force re-render when component mounts
		email = '';
		password = '';
		error = null;
		isLoading = false;
	});

	export const isAuthenticated = writable(false);

	async function handleLogin() {
		error = null;
		isLoading = true;
		try {
			if (!auth) {
				throw new Error('Authentication service is not initialized');
			}
			await signInWithEmailAndPassword(auth, email, password);
			console.log('Login successful');
			invalidateAll();
			isAuthenticated.set(true);
			location.href = '/' + '#loggedin';
		} catch (err) {
			error = err.message || 'An error occurred during login';
		} finally {
			isLoading = false;
		}
	}

	function goToRegister() {
		goto('/register');
	}

	async function forgotPassword() {
		if (!email) {
			error = 'Please enter your email address';
			return;
		}

		isLoading = true;
		error = null;
		successMessage = '';

		try {
			await sendPasswordResetEmail(auth, email);
			successMessage = 'Password reset email sent. Please check your inbox - remember to check your spam folder!';
		} catch (err) {
			error = err.message || 'An error occurred while sending the password reset email';
		} finally {
			isLoading = false;
		}
	}

	function goToHome() {
		location.href = '/';
	}
</script>

<div class="container mx-auto p-4 bg-custom">
	<div class="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto mt-24">
		<h2 class="text-2xl font-semibold text-center text-[#FF8236]">Login</h2>
		<form on:submit|preventDefault={handleLogin} class="mt-4">
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
			<button
				type="submit"
				class="bg-[#FF8236] text-white p-2 w-full rounded hover:bg-[#e57c29]"
				disabled={isLoading}
			>
				{isLoading ? 'Logging in...' : 'Login'}
			</button>
		</form>
		{#if error}
			<p class="text-red-500 text-center mt-2">{error}</p>
		{/if}
		{#if successMessage}
			<p class="text-green-500 text-center mt-2">{successMessage}</p>
		{/if}
		<div class="text-center mt-4">
			<button on:click={forgotPassword} class="text-[#FF8236] hover:underline" disabled={isLoading}>
				{isLoading ? 'Sending...' : 'Forgot Password?'}
			</button>
		</div>
		<div class="text-center mt-4">
			<button on:click={goToRegister} class="text-[#FF8236] hover:underline"
				>Don't have an account? Register</button
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
