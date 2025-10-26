<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../../lib/firebase';
	import {
		collection,
		query,
		doc,
		getDoc,
		getDocs,
		updateDoc,
		arrayUnion,
		Timestamp,
		onSnapshot
	} from 'firebase/firestore';
	import { ThumbsUp, ThumbsDown, AlertTriangle, MessageSquare, Copy } from 'lucide-svelte';

	let drafts = [];
	let currentUser;
	let isAdmin = false;

	let totalCost = 0;
	let uniqueParts = 0;
	let totalParts = 0;
	let processedParts = []; // Changed to array instead of Map

	onMount(async () => {
		try {
			const draftsQuery = query(collection(db, 'drafts'));
			const unsubscribeDrafts = onSnapshot(draftsQuery, (snapshot) => {
				drafts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
				processPartsData();
			});

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

			return () => {
				unsubscribeDrafts();
				unsubscribeAuth();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
		}
	});

	function processPartsData() {
		const partsMap = new Map();
		totalCost = 0;
		totalParts = 0;

		drafts.forEach((draft) => {
			if (draft.partsAndCosts && Array.isArray(draft.partsAndCosts)) {
				draft.partsAndCosts.forEach((item) => {
					if (!item.part) return;

					const partName = item.part;
					const itemQuantity = parseInt(item.quantity) || 0;
					const itemCost = parseFloat(item.cost) || 0;

					totalParts += itemQuantity;

					if (partsMap.has(partName)) {
						const existingPart = partsMap.get(partName);
						existingPart.quantity += itemQuantity;
						existingPart.sources.push({
							cost: itemCost,
							draftId: draft.id,
							link: item.link || null,
							reimbursement: Boolean(item.reimbursement)
						});
					} else {
						partsMap.set(partName, {
							name: partName,
							quantity: itemQuantity,
							sources: [
								{
									cost: itemCost,
									draftId: draft.id,
									link: item.link || null,
									reimbursement: Boolean(item.reimbursement)
								}
							]
						});
					}
				});
			}
		});

		// Convert Map to Array and calculate totals
		processedParts = Array.from(partsMap.values()).map((part) => {
			const bestPrice = Math.min(...part.sources.map((s) => s.cost));
			const partTotalCost = part.quantity * bestPrice;
			totalCost += partTotalCost;
			return {
				...part,
				bestPrice,
				totalCost: partTotalCost
			};
		});

		uniqueParts = processedParts.length;
	}

	function getRowClass(part) {
		return part.sources.some((source) => source.reimbursement) ? 'bg-yellow-50' : '';
	}
</script>

{#if isAdmin}
	<div class="bg-white bg-custom">
		<div class="relative z-100">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					PROCUREMENT
				</h2>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Total Cost</span>
							<span class="block text-3xl font-bold text-orange-500">${totalCost.toFixed(2)}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Unique Parts</span>
							<span class="block text-3xl font-bold text-orange-500">{uniqueParts}</span>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-4">
						<div class="text-center">
							<span class="block text-lg font-semibold text-gray-700">Total Parts</span>
							<span class="block text-3xl font-bold text-orange-500">{totalParts}</span>
						</div>
					</div>
				</div>

				<!-- Parts Table -->
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="overflow-x-auto">
						<!-- Add horizontal scroll wrapper -->
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6 truncate"
									>
										Part Name
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
									>
										Quantity
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
									>
										Best Price
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
									>
										Total Cost
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
									>
										Sources & Links
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each processedParts as part}
									<tr class={getRowClass(part)}>
										<td class="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 truncate max-w-xs">
											{part.name}
											{#if part.sources.some((source) => source.reimbursement)}
												<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
													Reimbursement
												</span>
											{/if}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{part.quantity}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											${part.bestPrice.toFixed(2)}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											${part.totalCost.toFixed(2)}
										</td>
										<td class="px-6 py-4 text-sm text-gray-500">
											<div class="space-y-1">
												{#each part.sources as source}
													<div class="flex items-center space-x-2">
														<span>${source.cost.toFixed(2)}</span>
														{#if source.link}
															<a
																href={source.link}
																target="_blank"
																rel="noopener noreferrer"
																class="text-orange-500 hover:text-orange-700 break-all"
															>
																Link
															</a>
														{/if}
													</div>
												{/each}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom">
		<div class="relative z-100 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					PROCUREMENT
				</h2>
			</div>
			<p>Please login as admin or return to home.</p>
			<button
				class="bg-orange-500 text-white px-4 py-2 rounded-lg mt-4"
				on:click={() => (window.location.href = '/')}>Home</button
			>
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
