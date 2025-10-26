<script>
	import { onMount } from 'svelte';
	import { db } from '../../lib/firebase';
	import { collection, query, getDocs, where } from 'firebase/firestore';
	import ExcelJS from 'exceljs';

	// State variables
	let drafts = [];
	let isExporting = false;

	// Query for drafts with signed contract
	const q = query(collection(db, 'drafts'), where('hasSignedContract', '==', true));

	// Fetch drafts on component mount
	onMount(async () => {
		try {
			const querySnapshot = await getDocs(q);
			drafts = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('Error fetching drafts:', error);
		}
	});

	// Function to sanitize sheet names
	function sanitizeSheetName(name) {
		// Remove invalid characters
		let sanitized = name.replace(/[*?:/\\[\]]/g, '');

		// Truncate to max 31 characters
		if (sanitized.length > 31) {
			sanitized = sanitized.substring(0, 28) + '...';
		}

		// Ensure name is not empty
		return sanitized || 'Unnamed Project';
	}

	// Function to create spreadsheet data for a draft
	function createSpreadsheetData(draft) {
		if (!draft.partsAndCosts) return [];

		return Object.entries(draft.partsAndCosts).map(([key, item]) => ({
			Part: item.part || key,
			Quantity: item.quantity || 0,
			Cost: item.cost || 0,
			Link: item.link || '',
			Reimbursement: item.reimbursement || 0
		}));
	}

	// Function to export all drafts to multi-tab Excel file
	async function exportToMultiTabExcel() {
		isExporting = true;

		try {
			// Create a workbook
			const workbook = new ExcelJS.Workbook();

			// Keep track of used sheet names to ensure uniqueness
			const usedNames = new Set();

			// Add a worksheet for each draft
			drafts.forEach((draft, index) => {
				const worksheetData = createSpreadsheetData(draft);

				// Determine sheet name
				let sheetName = draft.title || draft.id || `Project ${index + 1}`;

				// Sanitize and ensure unique name
				let finalSheetName = sanitizeSheetName(sheetName);
				let baseSheetName = finalSheetName;
				let counter = 1;

				// Ensure unique sheet name
				while (usedNames.has(finalSheetName)) {
					finalSheetName = `${baseSheetName}_${counter}`;
					counter++;
				}

				// Add to used names
				usedNames.add(finalSheetName);

				// Create worksheet
				const worksheet = workbook.addWorksheet(finalSheetName);

				// Add headers if there's data
				if (worksheetData.length > 0) {
					const headers = Object.keys(worksheetData[0]);
					worksheet.addRow(headers);

					// Add data rows
					worksheetData.forEach(row => {
						worksheet.addRow(Object.values(row));
					});

					// Auto-fit column widths
					worksheet.columns.forEach(column => {
						if (column.header) {
							column.width = Math.max(column.header.length + 2, 10);
						}
					});
				}
			});

			// Generate buffer and trigger download
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			
			// Create download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'all_projects_parts_and_costs.xlsx';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error exporting Excel:', error);
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="container mx-auto p-4 mt-20">
	{#if drafts.length === 0}
		<div class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
			<div
				class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"
			></div>
		</div>
	{:else}
		<div class="flex flex-col">
			<div class="bg-white shadow-md rounded-lg p-6">
				<h2 class="text-4xl font-extrabold mb-4 text-orange-500">PARTS BY TEAM</h2>

				<div class="overflow-x-auto">
					<table class="w-full text-sm text-left">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2">Project ID</th>
								<th class="px-4 py-2">Number of Parts</th>
							</tr>
						</thead>
						<tbody>
							{#each drafts as draft}
								<tr class="border-b hover:bg-gray-100">
									<td class="px-4 py-2">{draft.id}</td>
									<td class="px-4 py-2">
										{Object.keys(draft.partsAndCosts || {}).length}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-4">
					<button
						class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
						on:click={exportToMultiTabExcel}
						disabled={isExporting}
					>
						{#if isExporting}
							Exporting...
						{:else}
							Export All Projects to Excel
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
