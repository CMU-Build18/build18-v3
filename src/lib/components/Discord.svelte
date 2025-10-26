<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import {
		collection,
		query,
		doc,
		getDoc,
		getDocs,
		addDoc,
		updateDoc,
		deleteDoc,
		onSnapshot,
		orderBy,
		where,
		Timestamp
	} from 'firebase/firestore';

	const CHANNELS = {
		OFFICER: {
			id: 'officer',
			name: 'Officer Channel',
			webhook:
				'https://discord.com/api/webhooks/1298872519276630126/N1EPWj-YJV4oFPlvrlIZ_eV5VQ5xGLb9sPGB-wJZjaQmFhsE74GMpu-mdtH5Fl8OZoCD'
		},
		ANNOUNCEMENT: {
			id: 'announcement',
			name: 'Announcement Channel',
			webhook:
				'https://discord.com/api/webhooks/1298871116865077258/5k0DjciILsfwpixPE0FtcgddaiKGHitCgtJiAzYjeJ8CzQpdYPpPO98HAERcd3eQyCU-'
		}
	};

	let isAdmin = false;
	let currentUser = null;
	let discordPosts = [];
	let queuedPosts = [];
	let loading = false;
	let error = null;
	let success = null;

	// Form state
	let discordPost = {
		title: '',
		message: '',
		channel: CHANNELS.OFFICER.id,
		timestamp: null,
		scheduledFor: null,
		author: null,
		status: 'draft' // draft, queued, sent
	};

	// Date-time picker minimum (current time)
	$: minDateTime = new Date().toISOString().slice(0, 16);

	// Send message to Discord webhook
	async function sendToDiscord(webhook, content) {
		try {
			const response = await fetch(webhook, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: 'Build18 Bot',
					embeds: [
						{
							title: content.title,
							description: content.message,
							color: 0xffa500,
							footer: {
								text: `Posted by ${content.author}`
							}
						}
					]
				})
			});

			if (!response.ok) {
				throw new Error('Failed to send message to Discord');
			}

			return true;
		} catch (err) {
			console.error('Discord webhook error:', err);
			throw err;
		}
	}

	// Save message to Firestore
	async function saveToFirestore(content, status = 'sent') {
		try {
			const docRef = await addDoc(collection(db, 'discord'), {
				...content,
				timestamp: Timestamp.now(),
				scheduledFor: content.scheduledFor
					? Timestamp.fromDate(new Date(content.scheduledFor))
					: null,
				authorId: currentUser.uid,
				author: currentUser.email,
				status
			});
			return docRef;
		} catch (err) {
			console.error('Firestore error:', err);
			throw err;
		}
	}

	// Handle immediate sending
	async function handleSendNow(post) {
		loading = true;
		error = null;
		success = null;

		try {
			const selectedChannel = Object.values(CHANNELS).find((c) => c.id === post.channel);
			if (!selectedChannel) throw new Error('Invalid channel selected');

			await sendToDiscord(selectedChannel.webhook, post);

			// Update status in Firestore
			const docRef = doc(db, 'discord', post.id);
			await updateDoc(docRef, {
				status: 'sent',
				sentAt: Timestamp.now()
			});

			success = 'Message sent successfully!';
		} catch (err) {
			error = `Error sending message: ${err.message}`;
		} finally {
			loading = false;
			setTimeout(() => {
				success = null;
				error = null;
			}, 5000);
		}
	}

	// Handle form submission
	async function handleSubmit(event) {
		event.preventDefault();
		loading = true;
		error = null;
		success = null;

		try {
			const selectedChannel = Object.values(CHANNELS).find((c) => c.id === discordPost.channel);
			if (!selectedChannel) throw new Error('Invalid channel selected');

			// Prepare message content
			const content = {
				...discordPost,
				author: currentUser.email
			};

			if (discordPost.scheduledFor) {
				// Save as queued message
				await saveToFirestore(content, 'queued');
				success = 'Message queued successfully!';
			} else {
				// Send immediately and save
				await Promise.all([
					sendToDiscord(selectedChannel.webhook, content),
					saveToFirestore(content, 'sent')
				]);
				success = 'Message sent successfully!';
			}

			// Reset form
			discordPost = {
				title: '',
				message: '',
				channel: CHANNELS.OFFICER.id,
				timestamp: null,
				scheduledFor: null,
				author: null,
				status: 'draft'
			};
		} catch (err) {
			error = `Error: ${err.message}`;
		} finally {
			loading = false;
			setTimeout(() => {
				success = null;
				error = null;
			}, 5000);
		}
	}

	// Delete queued message
	async function deleteQueuedMessage(postId) {
		try {
			await deleteDoc(doc(db, 'discord', postId));
			success = 'Queued message deleted successfully!';
		} catch (err) {
			error = `Error deleting message: ${err.message}`;
		}
	}

	// Check for messages that need to be sent
	async function checkQueuedMessages() {
		const now = new Date();
		const queuedMessages = queuedPosts.filter((post) => {
			const scheduledTime = post.scheduledFor.toDate();
			return scheduledTime <= now && post.status === 'queued';
		});

		for (const post of queuedMessages) {
			await handleSendNow(post);
		}
	}

	onMount(async () => {
		try {
			// Set up real-time listener for sent messages
			const sentMessagesQuery = query(
				collection(db, 'discord'),
				where('status', '==', 'sent'),
				orderBy('timestamp', 'desc')
			);

			// Set up real-time listener for queued messages
			const queuedMessagesQuery = query(
				collection(db, 'discord'),
				where('status', '==', 'queued'),
				orderBy('scheduledFor', 'asc')
			);

			const unsubscribeSent = onSnapshot(sentMessagesQuery, (snapshot) => {
				discordPosts = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
					timestamp: doc.data().timestamp.toDate().toLocaleString()
				}));
			});

			const unsubscribeQueued = onSnapshot(queuedMessagesQuery, (snapshot) => {
				queuedPosts = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
					scheduledFor: doc.data().scheduledFor,
					formattedScheduledFor: doc.data().scheduledFor.toDate().toLocaleString()
				}));
			});

			// Set up auth listener
			const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
				if (user) {
					currentUser = user;
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						const userData = userDoc.data();
						isAdmin = userData.isAdmin;
					}
				}
			});

			// Set up interval to check queued messages
			const checkInterval = setInterval(checkQueuedMessages, 60000); // Check every minute

			// Cleanup function
			return () => {
				unsubscribeSent();
				unsubscribeQueued();
				unsubscribeAuth();
				clearInterval(checkInterval);
			};
		} catch (error) {
			console.error('Error in onMount:', error);
		}
	});

	console.log('posts:', discordPosts);
</script>

{#if isAdmin}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28">
					DISCORD ANNOUNCEMENTS
				</h2>

				<!-- Status Messages -->
				{#if error}
					<div class="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
						{error}
					</div>
				{/if}
				{#if success}
					<div class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
						{success}
					</div>
				{/if}

				<!-- New Message Form -->
				<div class="mb-8 bg-white p-6 rounded-lg shadow-md">
					<h3 class="text-2xl font-bold text-orange-500 mb-4">New Message</h3>
					<form onsubmit={handleSubmit}>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="channel" class="block text-sm font-medium text-gray-700">Channel</label>
								<select
									id="channel"
									bind:value={discordPost.channel}
									class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
								>
									{#each Object.values(CHANNELS) as channel}
										<option value={channel.id}>{channel.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
								<input
									type="text"
									id="title"
									required
									bind:value={discordPost.title}
									class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
								/>
							</div>
						</div>
						<div>
							<label for="message" class="block text-sm font-medium text-gray-700">Message</label>
							<textarea
								id="message"
								required
								rows="4"
								bind:value={discordPost.message}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
							></textarea>
						</div>
						<div>
							<label for="scheduledFor" class="block text-sm font-medium text-gray-700 my-2">
								Schedule For (optional)
							</label>
							<input
								type="datetime-local"
								id="scheduledFor"
								bind:value={discordPost.scheduledFor}
								min={minDateTime}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
							/>
						</div>
						<div>
							<button
								type="submit"
								disabled={loading}
								class="w-full mt-4 md:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Sending...' : discordPost.scheduledFor ? 'Queue Message' : 'Send Now'}
							</button>
						</div>
					</form>
				</div>

				<!-- Queued Messages -->
				{#if queuedPosts.length > 0}
					<div class="mb-8">
						<h3 class="text-2xl font-bold text-orange-500 mb-4">Queued Messages</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each queuedPosts as post}
								<div class="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
									<div class="flex justify-between items-start mb-2">
										<h4 class="text-xl font-bold text-orange-500">{post.title}</h4>
										<span class="text-sm text-gray-500">{post.channel}</span>
									</div>
									<p class="text-gray-700 mb-2 whitespace-pre-wrap">{post.message}</p>
									<div class="text-sm text-gray-500 mb-4">
										<p>Scheduled for: {post.formattedScheduledFor}</p>
										<p>Queued by: {post.author}</p>
									</div>
									<div class="flex space-x-2">
										<button
											onclick={() => handleSendNow(post)}
											disabled={loading}
											class="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											Send Now
										</button>
										<button
											onclick={() => deleteQueuedMessage(post.id)}
											disabled={loading}
											class="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
										>
											Delete
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Sent Messages -->
				<div class="mb-8">
					<h3 class="text-2xl font-bold text-orange-500 mb-4">Sent Messages</h3>
					{#if discordPosts.length === 0}
						<p class="text-center text-gray-500 py-8">No messages sent yet</p>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each discordPosts as post}
								<div class="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
									<div class="flex justify-between items-start mb-2">
										<h4 class="text-xl font-bold text-orange-500">{post.title}</h4>
										<span class="text-sm text-gray-500">{post.channel}</span>
									</div>
									<p class="text-gray-700 mb-2 whitespace-pre-wrap">{post.message}</p>
									<div class="text-sm text-gray-500">
										<p>Sent by: {post.author}</p>
										<p>Sent at: {post.timestamp}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom min-h-screen">
		<div class="relative z-10 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-orange-500 pt-28">DISCORD ANNOUNCEMENTS</h2>
				<p class="text-gray-700 mb-4">Please login as admin or return to home.</p>
				<button
					class="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
					onclick={() => (window.location.href = '/')}
				>
					Return Home
				</button>
			</div>
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
