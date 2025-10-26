<script>
	import { createEventDispatcher } from 'svelte';

	export let show = false;
	let pasteArea = '';
	const dispatch = createEventDispatcher();

	function handlePaste() {
		const rows = pasteArea.trim().split('\n');
		const parsedData = rows.map((row) => {
			let [part, cost, quantity, link] = row.split('\t');
			cost = cost.replace('$', '');
			
			return { part, cost: parseFloat(cost), quantity: parseInt(quantity, 10), link };
		});
		dispatch('paste', parsedData);
		show = false;
		pasteArea = '';
	}

	function handleClose() {
		show = false;
		pasteArea = '';
	}
</script>

{#if show}
	<div
		class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center"
	>
		<div class="bg-white p-5 rounded-lg shadow-xl w-full max-w-2xl">
			<h2 class="text-xl font-semibold mb-4">Paste Parts Data</h2>
			<p class="mb-2">
				Copy / Paste data from a spreadsheet in the format: <br/>Part name [tab] Unit Cost [tab] Quantity [tab] Link
			</p>
			<textarea
				bind:value={pasteArea}
				class="w-full h-40 p-2 border border-gray-300 rounded"
				placeholder="Part1&#9;$10.00&#9;2&#9;https://build18.org"
			></textarea>
			<div class="flex justify-end mt-4">
				<button
					on:click={handleClose}
					class="px-4 py-2 bg-gray-300 text-gray-800 rounded mr-2 hover:bg-gray-400"
				>
					Cancel
				</button>
				<button
					on:click={handlePaste}
					class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Add Parts
				</button>
			</div>
		</div>
	</div>
{/if}
