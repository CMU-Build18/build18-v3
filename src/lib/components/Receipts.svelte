<script>
	import { onMount, tick } from 'svelte';
	import { db } from '../firebase';
	import { collection, getDocs } from 'firebase/firestore';
	import html2canvas from 'html2canvas';

	let receipts = [];
	const logoUrl = '/favicon.png';

	async function fetchDrafts() {
		const draftsRef = collection(db, 'drafts');
		const draftsSnapshot = await getDocs(draftsRef);
		const drafts = draftsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		receipts = drafts
			.filter((draft) => draft.hasSignedContract)
			.map((draft) => ({
				date: draft.lastUpdated?.toDate()?.toLocaleDateString() || '',
				title: draft.title || 'Untitled',
				teamId: draft.teamId || 'N/A',
				teamName: draft.teamName || 'Unnamed Team',
				partsAndCosts: draft.partsAndCosts || []
			}));
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
				useCORS: false
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

	onMount(fetchDrafts);
</script>

<div class="mt-24">
	{#each receipts as receipt, index (receipt.id + '-' + index)}
		<div id="receipt-{receipt.id || 'unknown'}-{index}" class="receipt">
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
					<div class="receipt-item {part.reimbursement ? 'reimbursement' : ''}">
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
			<div class="message">We look forward to building with you soon!</div>
		</div>
		<button class="export-btn" on:click={() => exportToPNG(`${receipt.id || 'unknown'}-${index}`)}>
			Copy to Clipboard
		</button>
	{/each}
</div>

<style>
	.receipt {
		font-family: 'Courier New', monospace;
		width: 300px;
		background: #fffbea;
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
	.reimbursement {
		color: #ff4500;
		font-weight: bold;
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
	}
	.export-btn {
		display: block;
		margin: 10px auto;
		padding: 5px 10px;
		background: #4caf50;
		color: white;
		border: none;
		border-radius: 5px;
		cursor: pointer;
	}
	.export-btn:hover {
		background: #45a049;
	}
</style>
