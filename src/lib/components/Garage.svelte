<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	let projects = [];
	let filteredProjects = [];
	let selectedProject = null;
	let searchTerm = '';
	let loading = true;
	let loadedCount = 12;
	let loadingMore = false;
	let observer;
	let initialProjectsLoaded = false;
	let projectsCache = null;

	// Debounce function
	function debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Cache management
	const getCachedProjects = () => {
		if (typeof localStorage !== 'undefined') {
			try {
				const cached = localStorage.getItem('garage-projects');
				if (cached) {
					const cacheObject = JSON.parse(cached);
					const { data, timestamp, version, partial } = cacheObject;

					// Cache for 2 hours (longer for better performance)
					const maxAge = 2 * 60 * 60 * 1000; // 2 hours
					const isExpired = Date.now() - timestamp > maxAge;

					if (!isExpired && data && Array.isArray(data)) {
						if (partial) {
							console.log('Using partial cached projects:', data.length);
						} else {
							console.log('Using full cached projects:', data.length);
						}
						return data;
					} else if (isExpired) {
						console.log('Cache expired, will reload');
						localStorage.removeItem('garage-projects');
					}
				}
			} catch (error) {
				console.warn('Error reading cached projects:', error);
				// Clear corrupted cache
				try {
					localStorage.removeItem('garage-projects');
				} catch (clearError) {
					console.warn('Could not clear corrupted cache');
				}
			}
		}
		return null;
	};

	const setCachedProjects = (data) => {
		if (typeof localStorage !== 'undefined' && data && data.length > 0) {
			try {
				// Only cache essential data to reduce size
				const cacheData = data.map((project) => ({
					id: project.id,
					title: project.title,
					date: project.date,
					detail: project.detail,
					extended_details: project.extended_details,
					team_profiles: project.team_profiles,
					parts_and_costs: project.parts_and_costs,
					image: project.image
				}));

				const cacheObject = {
					data: cacheData,
					timestamp: Date.now(),
					version: '1.0' // Add version for future cache invalidation
				};

				localStorage.setItem('garage-projects', JSON.stringify(cacheObject));
				console.log('Cached', data.length, 'projects');
			} catch (error) {
				console.warn('Failed to cache projects to localStorage:', error.message);
				// If storage is full, try to clear old cache and retry
				if (error.name === 'QuotaExceededError') {
					try {
						localStorage.removeItem('garage-projects');
						localStorage.removeItem('garage-projects-backup');
						console.info('Cleared old cache due to quota exceeded');
						// Try once more with reduced data
						try {
							const minimalData = data.slice(0, 100).map((p) => ({
								id: p.id,
								title: p.title,
								date: p.date,
								detail: p.detail,
								image: p.image,
								team_profiles: p.team_profiles
							}));
							localStorage.setItem(
								'garage-projects',
								JSON.stringify({
									data: minimalData,
									timestamp: Date.now(),
									partial: true
								})
							);
						} catch (retryError) {
							console.warn('Could not cache even minimal data');
						}
					} catch (clearError) {
						console.warn('Could not clear localStorage cache');
					}
				}
			}
		}
	};

	// Optimized progressive loading function
	async function loadProjectsProgressively() {
		console.log('Starting project loading...');

		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.removeItem('garage-projects');
				console.log('Cleared old project cache');
			} catch (error) {
				console.warn('Could not clear cache');
			}
		}

		try {
			// First, get the manifest to know which projects exist
			const manifestResponse = await fetch('/projects/manifest.json');
			let projectFiles = [];

			if (manifestResponse.ok) {
				projectFiles = await manifestResponse.json();
				console.log(
					'Loaded manifest with',
					projectFiles.length,
					'projects (including missing ones)'
				);
			} else {
				// Fallback: generate list of expected files (up to 250)
				console.log('Manifest not found, using fallback approach');
				for (let i = 1; i <= 250; i++) {
					projectFiles.push(`${String(i).padStart(5, '0')}.json`);
				}
			}

			const loadedProjects = [];
			let failedCount = 0;

			// Load projects in batches for better performance
			const batchSize = 20;
			const maxConcurrent = 5;

			for (let i = 0; i < projectFiles.length; i += batchSize) {
				const batch = projectFiles.slice(i, i + batchSize);
				const batchPromises = [];

				for (let j = 0; j < batch.length; j += maxConcurrent) {
					const concurrentBatch = batch.slice(j, j + maxConcurrent);
					const promises = concurrentBatch.map(async (file) => {
						try {
							const response = await fetch(`/projects/${file}`);
							if (!response.ok) {
								failedCount++;
								return null;
							}
							const project = await response.json();

							// Add unique ID for reactivity and validate required fields
							project.id = project.id || `project-${file.replace('.json', '')}`;
							project.title = project.title || 'Untitled Project';
							project.date = project.date || 'Unknown';
							project.detail = project.detail || '';
							project.extended_details = project.extended_details || '';
							project.team_profiles = project.team_profiles || [];
							project.parts_and_costs = project.parts_and_costs || [];

							return project;
						} catch (error) {
							console.warn('Error loading project file:', file, error);
							failedCount++;
							return null;
						}
					});

					batchPromises.push(...promises);
				}

				const batchResults = await Promise.all(batchPromises);
				const validProjects = batchResults.filter((project) => project !== null);
				loadedProjects.push(...validProjects);

				// Update progress and show partial results for better UX
				if (loadedProjects.length > 0 && i === 0) {
					// Show first batch immediately
					projects = [...loadedProjects];
					loading = false;
					initialProjectsLoaded = true;
					await tick();
					debouncedFilterProjects();
				} else if (loadedProjects.length > projects.length) {
					// Update with new projects
					projects = [...loadedProjects];
					await tick();
					debouncedFilterProjects();
				}

				console.log(`Loaded ${loadedProjects.length} projects (${failedCount} failed)`);
			}

			// Sort by date (newest first), handling invalid dates
			loadedProjects.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);

				// Handle invalid dates
				if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
				if (isNaN(dateA.getTime())) return 1;
				if (isNaN(dateB.getTime())) return -1;

				return dateB - dateA;
			});

			projects = loadedProjects;
			initialProjectsLoaded = true;
			loading = false;

			console.log('All projects loaded:', projects.length, 'failed:', failedCount);
			await tick();
			debouncedFilterProjects();
		} catch (error) {
			console.error('Error in project loading:', error);
			loading = false;
			initialProjectsLoaded = true; // Set to true to show error state
		}
	}

	onMount(async () => {
		loadProjectsProgressively();

		// Set up intersection observer
		observer = new IntersectionObserver(handleIntersection, {
			rootMargin: '100px',
			threshold: 0.1
		});
	});

	onDestroy(() => {
		// Clean up intersection observer
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	});

	function openProject(project) {
		selectedProject = project;
	}

	function closeModal() {
		selectedProject = null;
	}

	function handleKeydown(event, project) {
		if (event.key === 'Enter' || event.key === ' ') {
			openProject(project);
		}
	}

	function handleModalKeydown(event) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	const debouncedFilterProjects = debounce(async () => {
		await tick();
		if (!projects || projects.length === 0) {
			filteredProjects = [];
			return;
		}

		const searchLower = searchTerm.toLowerCase().trim();

		if (!searchLower) {
			filteredProjects = [...projects];
		} else {
			filteredProjects = projects.filter((project) => {
				// Safely check title
				const titleMatch = project.title && project.title.toLowerCase().includes(searchLower);

				// Safely check detail
				const detailMatch = project.detail && project.detail.toLowerCase().includes(searchLower);

				// Safely check extended details
				const extendedMatch =
					project.extended_details && project.extended_details.toLowerCase().includes(searchLower);

				// Safely check team profiles
				const teamMatch =
					project.team_profiles &&
					project.team_profiles.some(
						(profile) => profile && profile.name && profile.name.toLowerCase().includes(searchLower)
					);

				return titleMatch || detailMatch || extendedMatch || teamMatch;
			});
		}

		loadedCount = 12;
	}, 300);

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		await tick();
		loadedCount += 12;
		loadingMore = false;
	}

	function handleIntersection(entries) {
		entries.forEach((entry) => {
			if (entry.isIntersecting && !loadingMore) {
				loadMore();
			}
		});
	}

	// Preload images for better UX
	function preloadNextImages() {
		const nextBatch = filteredProjects.slice(loadedCount, loadedCount + 6);
		nextBatch.forEach((project) => {
			if (project.image && !project.image.startsWith('data:image/svg+xml')) {
				try {
					const img = new Image();
					img.onload = () => console.log('Preloaded:', project.title);
					img.onerror = () => console.warn('Failed to preload:', project.title);
					img.src = project.image;
				} catch (error) {
					console.warn('Error preloading image for', project.title, error);
				}
			}
		});
	}

	// Preload images when user scrolls near the bottom
	$: if (filteredProjects.length > loadedCount && scrollY > 0) {
		try {
			const documentHeight = document.documentElement.scrollHeight;
			const windowHeight = window.innerHeight;
			const scrollPercentage = (scrollY + windowHeight) / documentHeight;

			if (scrollPercentage > 0.8) {
				preloadNextImages();
			}
		} catch (error) {
			console.warn('Error calculating scroll percentage:', error);
		}
	}

	function observeLastItem(node) {
		if (node) {
			observer.observe(node);
		}

		return {
			destroy() {
				if (node) {
					observer.unobserve(node);
				}
			}
		};
	}

	// Performance optimization: only re-filter when search term changes or projects array changes
	$: if (searchTerm !== undefined || projects.length > 0) {
		debouncedFilterProjects();
	}

	// Scroll to top functionality
	let showBackToTop = false;
	let scrollY = 0;

	$: showBackToTop = scrollY > 400;

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window bind:scrollY />

<section id="garage" class="px-12 bg-white bg-custom relative">
	<h2 class="text-6xl font-extrabold mb-8 text-center text-[#ff8236] pt-32 mx-auto">GARAGE</h2>

	<div class="container mx-auto px-4 pb-4">
		<div class="mb-6 space-y-4">
			<div class="relative">
				<label for="search" class="sr-only">Search projects</label>
				<div class="relative">
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Search projects by title, description, or team member..."
						class="w-full px-4 py-3 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300 bg-white shadow-sm"
					/>
					<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							></path>
						</svg>
					</div>
					{#if searchTerm}
						<button
							class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
							on:click={() => (searchTerm = '')}
							aria-label="Clear search"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Results summary -->
			{#if initialProjectsLoaded}
				<div class="flex justify-between items-center text-sm text-gray-600">
					<div>
						{#if searchTerm}
							Showing {filteredProjects.length} of {projects.length} projects
						{/if}
					</div>
					{#if !loading && projects.length === 0}
						<div class="text-gray-400">No projects found</div>
					{:else if loading && !initialProjectsLoaded}
						<div class="text-gray-400">Loading projects...</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#if loading && !initialProjectsLoaded}
				{#each Array(12) as _, i (i)}
					<div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
						<div class="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
							<div
								class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-pulse"
							></div>
						</div>
						<div class="p-4 space-y-3">
							<div
								class="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"
								style="width: {Math.random() * 40 + 60}%"
							></div>
							<div
								class="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"
								style="width: {Math.random() * 30 + 40}%"
							></div>
						</div>
					</div>
				{/each}
			{:else}
				{#each filteredProjects.slice(0, loadedCount) as project, index (project.id)}
					<div
						in:fade={{ duration: 300, delay: Math.min(index * 50, 600) }}
						out:fade={{ duration: 200 }}
						use:observeLastItem={index === Math.min(loadedCount - 1, filteredProjects.length - 1)}
					>
						<button
							class="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff8236] text-left w-full group"
							on:click={() => openProject(project)}
							on:keydown={(event) => handleKeydown(event, project)}
						>
							<div class="relative w-full h-48 bg-gray-100 overflow-hidden">
								{#if project.image}
									<img
										src={project.image}
										alt={project.title}
										class="w-full h-48 object-cover transition-all duration-300 group-hover:scale-110"
										loading={index < 6 ? 'eager' : 'lazy'}
										on:load={() => {
											console.log(`Image ${index + 1} loaded:`, project.title);
										}}
										on:error={(e) => {
											console.error(
												`Image ${index + 1} failed:`,
												project.title,
												'Path:',
												project.image
											);
											console.error('Attempted URL:', e.target?.src);
											e.target.style.display = 'none';
										}}
									/>
								{:else}
									<div class="w-full h-48 flex items-center justify-center bg-gray-200">
										<span class="text-gray-500">No image</span>
									</div>
								{/if}
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								></div>
							</div>
							<div class="p-4">
								<h3
									class="text-lg font-semibold text-gray-800 group-hover:text-[#ff8236] transition-colors duration-300"
								>
									{project.title}
								</h3>
								<p class="text-sm text-gray-600 mt-2">{project.date}</p>
								{#if project.team_profiles && project.team_profiles.length > 0}
									<p class="text-xs text-gray-500 mt-1">
										{project.team_profiles.length} team member{project.team_profiles.length !== 1
											? 's'
											: ''}
									</p>
								{/if}
							</div>
						</button>
					</div>
				{/each}

				<!-- Loading more indicator -->
				{#if filteredProjects.length > loadedCount}
					<div class="col-span-full flex justify-center py-8">
						<div class="animate-pulse text-gray-500 flex items-center space-x-2">
							<div class="w-2 h-2 bg-[#ff8236] rounded-full animate-bounce"></div>
							<div
								class="w-2 h-2 bg-[#ff8236] rounded-full animate-bounce"
								style="animation-delay: 0.1s"
							></div>
							<div
								class="w-2 h-2 bg-[#ff8236] rounded-full animate-bounce"
								style="animation-delay: 0.2s"
							></div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		{#if loadingMore}
			<div class="text-center mt-8 py-4">
				<div class="flex items-center justify-center space-x-2">
					<div
						class="animate-spin rounded-full h-6 w-6 border-2 border-[#ff8236] border-t-transparent"
					></div>
					<p class="text-gray-600">Loading more projects...</p>
				</div>
			</div>
		{/if}

		{#if !loading && !initialProjectsLoaded && projects.length === 0}
			<div class="text-center py-16">
				<div class="text-6xl mb-4">🔧</div>
				<h3 class="text-xl font-semibold text-gray-800 mb-2">No Projects Found</h3>
				<p class="text-gray-600">
					We couldn't load any projects at the moment. Please try refreshing the page.
				</p>
				<button
					class="mt-4 px-4 py-2 bg-[#ff8236] text-white rounded-lg hover:bg-opacity-90 transition-colors duration-300"
					on:click={() => window.location.reload()}
				>
					Refresh Page
				</button>
			</div>
		{/if}

		{#if searchTerm && filteredProjects.length === 0 && initialProjectsLoaded}
			<div class="text-center py-16 col-span-full">
				<div class="text-6xl mb-4">🔍</div>
				<h3 class="text-xl font-semibold text-gray-800 mb-2">No Results Found</h3>
				<p class="text-gray-600">Try adjusting your search terms or browse all projects.</p>
				<button
					class="mt-4 px-4 py-2 bg-[#ff8236] text-white rounded-lg hover:bg-opacity-90 transition-colors duration-300"
					on:click={() => (searchTerm = '')}
				>
					Clear Search
				</button>
			</div>
		{/if}
	</div>

	{#if selectedProject}
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
			role="dialog"
			aria-labelledby="modal-title"
			on:click={closeModal}
			on:keydown={handleModalKeydown}
			tabindex="-1"
			in:fade={{ duration: 200 }}
			out:fade={{ duration: 200 }}
		>
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
				role="document"
				on:click|stopPropagation
				on:keydown|stopPropagation
				in:slide={{ duration: 300 }}
				out:slide={{ duration: 300 }}
			>
				<div class="p-6">
					<h2 id="modal-title" class="text-2xl font-bold text-gray-800 mb-4">
						{selectedProject.title}
					</h2>
					<p class="text-sm text-gray-600 mb-4">{selectedProject.date}</p>
					<div class="w-full h-64 bg-gray-100 rounded-lg mb-4 relative overflow-hidden">
						{#if selectedProject.image}
							<img
								src={selectedProject.image}
								alt={selectedProject.title}
								class="w-full h-64 object-cover rounded-lg transition-opacity duration-300"
								loading="lazy"
								on:load={() => {
									console.log('Modal image loaded:', selectedProject.title);
								}}
								on:error={(e) => {
									console.error(
										'Modal image failed:',
										selectedProject.title,
										'Path:',
										selectedProject.image
									);
									e.target.style.display = 'none';
								}}
							/>
						{:else}
							<div class="w-full h-64 flex items-center justify-center bg-gray-200">
								<span class="text-gray-500">No image</span>
							</div>
						{/if}
					</div>
					<p class="text-gray-700 mb-4">{selectedProject.detail}</p>
					<p class="text-gray-700 mb-4">{selectedProject.extended_details}</p>

					{#if selectedProject.team_profiles && selectedProject.team_profiles.length > 0}
						<h3 class="text-xl font-semibold text-gray-800 mb-2">Team Profiles</h3>
						<ul class="mb-4">
							{#each selectedProject.team_profiles as profile}
								{#if profile && profile.name}
									<li class="text-gray-700">{profile.name}</li>
								{/if}
							{/each}
						</ul>
					{/if}

					{#if selectedProject.parts_and_costs && selectedProject.parts_and_costs.length > 0}
						<h3 class="text-xl font-semibold text-gray-800 mb-2">Parts and Costs</h3>
						<table class="w-full mb-4">
							<thead>
								<tr class="bg-gray-100">
									<th class="text-left p-2">Part</th>
									<th class="text-right p-2">Cost</th>
									<th class="text-right p-2">Quantity</th>
									<th class="text-right p-2">Total</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedProject.parts_and_costs as item}
									<tr class="border-b">
										<td class="p-2">{item.part}</td>
										<td class="text-right p-2">{item.cost}</td>
										<td class="text-right p-2">{item.quantity}</td>
										<td class="text-right p-2">{item.total}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}

					<button
						class="mt-4 bg-[#ff8236] text-white px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8236]"
						on:click={closeModal}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Back to top button -->
	{#if showBackToTop}
		<button
			class="fixed bottom-8 right-8 bg-[#ff8236] text-white p-3 rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-300 z-40 hover:scale-110"
			on:click={scrollToTop}
			aria-label="Back to top"
			in:fade={{ duration: 300 }}
			out:fade={{ duration: 300 }}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 10l7-7m0 0l7 7m-7-7v18"
				></path>
			</svg>
		</button>
	{/if}
</section>

<style>
	:global(body) {
		background-color: #fff;
	}

	.bg-custom {
		background-image: url('/background.svg');
		background-repeat: repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
