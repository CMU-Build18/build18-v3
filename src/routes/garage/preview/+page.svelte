<script>
	import { onMount } from 'svelte';
	import { db, auth, storage } from '$lib/firebase';
	import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
	import { Github, Instagram, Link2, Mail } from 'lucide-svelte';

	let userId = null;
	let userData = null;
	let projectData = null;
	let loading = true;
	let error = null;

	// Move the auth check into onMount
	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				userId = user.uid;
				fetchUserAndProject();
			} else {
				error = 'No user ID provided';
				loading = false;
			}
		});

		// Cleanup subscription on component destroy
		return () => unsubscribe();
	});

	const fetchUserAndProject = async () => {
		if (!userId) return;

		console.log('fetching...', userId);
		try {
			const userDocRef = doc(db, 'users', userId);
			const userSnapshot = await getDoc(userDocRef);

			if (!userSnapshot.exists()) {
				throw new Error('User not found');
			}
			userData = userSnapshot.data();
			console.log('User data:', userData);

			if (!userData.teamId) {
				throw new Error('No team ID found');
			}

			// Get team's project from expo collection first
			const expoQueryRef = collection(db, 'expo');
			const expoQuery = query(expoQueryRef, where('teamId', '==', userData.teamId));
			const expoSnapshot = await getDocs(expoQuery);

			if (!expoSnapshot.empty) {
				const expoDoc = expoSnapshot.docs[0];
				projectData = {
					...expoDoc.data(),
					id: expoDoc.id,
					isExpo: true
				};
				console.log('Expo project:', projectData);
			} else {
				const draftsQueryRef = collection(db, 'drafts');
				const draftQuery = query(draftsQueryRef, where('teamId', '==', userData.teamId));
				const draftSnapshot = await getDocs(draftQuery);

				if (!draftSnapshot.empty) {
					const draftDoc = draftSnapshot.docs[0];
					projectData = {
						...draftDoc.data(),
						id: draftDoc.id,
						isDraft: true
					};
					console.log('Draft project:', projectData);
				}
			}

			loading = false;
            console.log('Project data:', projectData);
		} catch (e) {
			console.error('Error fetching data:', e);
			error = e.message;
			loading = false;
		}
	};

	// Calculate total budget
	$: totalBudget =
		projectData?.partsAndCosts?.reduce(
			(sum, item) => sum + (item.cost || 0) * (item.quantity || 1),
			0
		) || 0;

	// Get reimbursable total
	$: reimbursableTotal =
		projectData?.partsAndCosts?.reduce(
			(sum, item) => (item.reimbursement ? sum + (item.cost || 0) * (item.quantity || 1) : sum),
			0
		) || 0;
    
</script>

<div class="bg-custom pt-32 min-h-screen">
	{#if loading}
		<div class="flex justify-center items-center min-h-[400px]">
			<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
		</div>
	{:else if error}
		<div class="text-red-500 text-center p-4">
			<p class="font-medium">Error loading profile</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else}
		<div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
			<!-- Header Section -->
			<div class="bg-gradient-to-r from-orange-400 to-orange-500 p-6">
				<div class="flex flex-col md:flex-row items-center gap-6">
					<div class="text-white">
						<h1 class="text-3xl font-bold">{userData?.name || 'Anonymous Builder'}</h1>
						<p class="text-orange-100">{userData?.bio || 'No bio provided'}</p>

						<!-- Social Links -->
						<div class="flex gap-4 mt-4">
							{#if userData?.github}
								<a
									href={userData.github}
									target="_blank"
									rel="noopener noreferrer"
									class="text-white hover:text-orange-200"
								>
									<Github size={24} />
								</a>
							{/if}
							{#if userData?.linkedin}
								<a
									href={userData.linkedin}
									target="_blank"
									rel="noopener noreferrer"
									class="text-white hover:text-orange-200"
									title="LinkedIn Profile"
								>
									<Link2 size={24} />
								</a>
							{/if}
							{#if userData?.email}
								<a href="mailto:{userData.email}" class="text-white hover:text-orange-200">
									<Mail size={24} />
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Project Section -->
			{#if projectData}
				<div class="p-6">
					<div class="mb-6">
						<div class="flex items-center gap-2">
							<h2 class="text-2xl font-bold text-gray-800">{projectData.title}</h2>
							{#if projectData.isExpo}
								<span class="px-2 py-1 text-sm bg-green-100 text-green-800 rounded">Expo</span>
							{:else if projectData.isDraft}
								<!-- <span class="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">Draft</span> -->
							{/if}
						</div>
						<p class="text-gray-600 mt-2">{projectData.detail}</p>
					</div>

					<!-- Awards -->
					{#if projectData.awards?.length > 0}
						<div class="mb-6">
							<h3 class="text-xl font-semibold text-gray-800 mb-3">Awards</h3>
							<div class="space-y-2">
								{#each projectData.awards as award}
									<div class="bg-orange-50 p-3 rounded-lg">
										<p class="font-medium text-orange-700">{award.detail}</p>
										{#if award.extendedDetails}
											<p class="text-sm text-orange-600 mt-1">{award.extendedDetails}</p>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Parts & Budget -->
					{#if projectData.partsAndCosts?.length > 0}
						<div class="mb-6">
							<h3 class="text-xl font-semibold text-gray-800 mb-3">Parts & Budget</h3>
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="bg-gray-50">
										<tr>
											<th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Part</th>
											<th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Quantity</th
											>
											<th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Cost</th>
											<th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Total</th>
											<th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Link</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200">
										{#each projectData.partsAndCosts as part}
											<tr class="hover:bg-gray-50">
												<td class="px-4 py-2">
													{part.part}
													{#if part.reimbursement}
														<span
															class="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded"
														>
															Reimbursable
														</span>
													{/if}
												</td>
												<td class="px-4 py-2">{part.quantity}</td>
												<td class="px-4 py-2">${part.cost.toFixed(2)}</td>
												<td class="px-4 py-2">${(part.cost * part.quantity).toFixed(2)}</td>
												<td class="px-4 py-2">
													{#if part.link}
														<a
															href={part.link}
															target="_blank"
															rel="noopener noreferrer"
															class="text-orange-500 hover:text-orange-600"
														>
															<Link2 size={16} />
														</a>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-gray-50">
										<tr class="font-medium">
											<td colspan="3" class="px-4 py-2 text-right">Total Budget:</td>
											<td class="px-4 py-2">${totalBudget.toFixed(2)}</td>
										</tr>
										<!-- <tr class="text-orange-600">
											<td colspan="3" class="px-4 py-2 text-right">Reimbursable:</td>
											<td class="px-4 py-2">${reimbursableTotal.toFixed(2)}</td>
										</tr> -->
									</tfoot>
								</table>
							</div>
						</div>
					{/if}

					<!-- Project Images -->
					{#if projectData.uploadedImages?.length > 0}
						<div>
							<h3 class="text-xl font-semibold text-gray-800 mb-3">Project Images</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each projectData.uploadedImages as image}
									<img
										src={image}
										alt="Project"
										class="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
									/>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-6 text-center text-gray-500">No project found for this user.</div>
			{/if}
		</div>
	{/if}
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
