<script>
	import { onMount, tick } from 'svelte';
	import { db, auth } from '../firebase';
	import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
	import html2canvas from 'html2canvas';

	let currentUser = null;
	let userId = null;
	let receipts = [];
	let receiptBackground = '#fffbea';
	let receiptTextColor = '#000000';
	const logoUrl = '/favicon.png';

	async function fetchDrafts() {
		try {
			await new Promise((resolve, reject) => {
				auth.onAuthStateChanged((authUser) => {
					if (authUser) {
						currentUser = authUser;
						userId = authUser.uid;
						resolve();
					} else {
						reject('User not authenticated');
					}
				});
			});

			const userRef = doc(db, 'users', userId);
			const userSnap = await getDoc(userRef);
			if (!userSnap.exists()) {
				console.error('User document does not exist');
				return;
			}
			const user = userSnap.data();

			const draftsRef = collection(db, 'drafts');
			const draftsQuery = query(draftsRef, where('teamId', '==', user.teamId));
			const draftsSnapshot = await getDocs(draftsQuery);

			receipts = draftsSnapshot.docs.map((doc) => ({
				id: doc.id,
				date: doc.data().lastUpdated?.toDate()?.toLocaleDateString() || '',
				title: doc.data().title || 'Untitled',
				teamId: doc.data().teamId || 'N/A',
				teamName: doc.data().teamName || 'Unnamed Team',
				partsAndCosts: doc.data().partsAndCosts || []
			}));
		} catch (error) {
			console.error('Error fetching drafts:', error);
		}
	}

	async function exportToPNG(identifier) {
		await tick();

		const receiptDiv = document.getElementById(`receipt-${identifier}`);
		if (!receiptDiv) {
			console.error(`Element with ID receipt-${identifier} not found.`);
			return;
		}

		try {
			const canvas = await html2canvas(receiptDiv, {
				scale: 2,
				useCORS: true,
				backgroundColor: receiptBackground
			});

			const link = document.createElement('a');
			link.download = `receipt-${identifier}.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch (error) {
			console.error('Error generating PNG:', error);
		}
	}

	async function copyToClipboard(identifier) {
		await tick();

		const receiptDiv = document.getElementById(`receipt-${identifier}`);
		if (!receiptDiv) {
			console.error(`Element with ID receipt-${identifier} not found.`);
			return;
		}

		try {
			const canvas = await html2canvas(receiptDiv, {
				scale: 2,
				useCORS: true,
				backgroundColor: receiptBackground
			});

			// Convert canvas to blob
			canvas.toBlob(async (blob) => {
				try {
					// Use Clipboard API to copy the image
					await navigator.clipboard.write([
						new ClipboardItem({
							'image/png': blob
						})
					]);

					// Optional: Show a success message
					console.log('Image copied to clipboard');
				} catch (err) {
					console.error('Failed to copy image to clipboard', err);
				}
			});
		} catch (error) {
			console.error('Error generating PNG:', error);
		}
	}

	onMount(() => {
		fetchDrafts();
	});
</script>

<div class="pt-28 bg-custom overflow-hidden">
	{#if receipts.length === 0}
		<div class="no-receipt-message">
			No receipt found. <a class="text-orange-400" href="https://build18.org/login">Login?</a>
		</div>
	{:else}
		<div class="customization-tools">
			<label>
				Background Color:
				<input type="color" bind:value={receiptBackground} />
			</label>
			<label>
				Text Color:
				<input type="color" bind:value={receiptTextColor} />
			</label>
		</div>
		{#each receipts as receipt, index (receipt.id + '-' + index)}
			<div
				id="receipt-{receipt.id || 'unknown'}-{index}"
				class="receipt"
				style="background: {receiptBackground}; color: {receiptTextColor}"
			>
				<div class="logo">
					<img src={logoUrl} alt="Organization Logo" width="80" />
				</div>
				<div class="receipt-header">BILL OF MATERIALS</div>
				<div><strong>Date:</strong> {receipt.date}</div>
				<div><strong>Title:</strong> {receipt.title}</div>
				<div><strong>Team:</strong> {receipt.teamName} (ID: {receipt.teamId})</div>
				<div>
					<strong>Parts:</strong>
					{#each receipt.partsAndCosts as part}
						<div class="receipt-item">
							<span>{part.part} x {part.quantity}</span>
							<span>${(part.cost * part.quantity).toFixed(2)}</span>
						</div>
					{/each}
				</div>
				<div class="total">
					Total: ${receipt.partsAndCosts
						.reduce((sum, part) => sum + part.cost * part.quantity, 0)
						.toFixed(2)}
				</div>
				<div class="qr-code">
					<img src="/survey.png" alt="QR Code" />
				</div>
				<div class="message">We look forward to building with you soon!</div>
			</div>
			<div class="flex justify-center items-center gap-2 mt-2 max-w-md mx-auto">
				<button
					class="export-btn-download px-4 py-2 bg-orange-500 text-white rounded"
					on:click={() => exportToPNG(`${receipt.id || 'unknown'}-${index}`)}
				>
					Download as .PNG
				</button>
				<button
					class="export-btn-copy px-4 py-2 bg-orange-500 text-white rounded"
					on:click={() => copyToClipboard(`${receipt.id || 'unknown'}-${index}`)}
				>
					Copy to Clipboard
				</button>
			</div>
		{/each}
	{/if}
</div>

<style>

	::-webkit-scrollbar {
		display: none;
	}
	:global(html) {
		scrollbar-width: none;
	}
	.customization-tools {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-bottom: 20px;
	}

	.no-receipt-message {
		text-align: center;
		margin-top: 20px;
	}
	.receipt {
		font-family: 'Courier New', monospace;
		width: 300px;
		border: 1px solid #e0e0e0;
		padding: 15px;
		margin: 10px auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	.logo {
		text-align: center;
		margin-bottom: 10px;
	}
	.receipt-header {
		text-align: center;
		font-weight: bold;
		margin-bottom: 10px;
	}
	.receipt-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 5px;
	}
	.total {
		font-weight: bold;
		border-top: 1px dashed #000;
		padding-top: 5px;
	}
	.message {
		text-align: center;
		margin-top: 10px;
		font-style: italic;
		font-size: small;
	}
	.export-btn-download {
		display: block;
		margin: 10px auto;
		padding: 5px 10px;
		background: #ff8236;
		color: white;
		border: none;
		border-radius: 5px;
		cursor: pointer;
	}
	.export-btn-download:hover {
		background: #ff6236;
	}
	.export-btn-copy {
		display: block;
		margin: 10px auto;
		padding: 5px 10px;
		background: #ffffff;
		color: #ff8236;
		border-style: solid;
		border-width: 2px;
		border-color: #ff8236;
		border-radius: 5px;
		cursor: pointer;
	}
	.export-btn-copy:hover {
		background: #fb967a;
	}
	.qr-code {
		text-align: center;
		margin-top: 10px;
		max-width: 120px;
		max-height: 120px;
		margin-left: auto;
		margin-right: auto;
	}
	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
