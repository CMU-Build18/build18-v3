<script>
	export let steps = [];
	export let current = 0;
	export let clickable = false;
	export let primary = '#ff8236';
</script>

<div class="w-full py-4">
	<div class="flex items-center justify-between">
		{#each steps as step, index}
			<div class="flex items-center {index < steps.length - 1 ? 'flex-1' : ''}">
				<!-- Step Circle and Label Container -->
				<div class="flex flex-col items-center">
					<!-- Step Circle -->
					{#if clickable}
						<button 
							class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-105"
							class:bg-orange-500={index <= current}
							class:border-orange-500={index <= current}
							class:text-white={index <= current}
							class:shadow-lg={index === current}
							class:bg-gray-100={index > current}
							class:border-gray-300={index > current}
							class:text-gray-400={index > current}
							style={index <= current ? `background-color: ${primary}; border-color: ${primary}; box-shadow: ${index === current ? `0 0 0 3px ${primary}20` : 'none'}` : ''}
							on:click={() => current = index}
						>
							{#if index < current}
								<!-- Checkmark for completed steps -->
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
								</svg>
							{:else}
								<span class="text-sm font-bold">{index + 1}</span>
							{/if}
						</button>
					{:else}
						<div 
							class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300"
							class:bg-orange-500={index <= current}
							class:border-orange-500={index <= current}
							class:text-white={index <= current}
							class:shadow-lg={index === current}
							class:bg-gray-100={index > current}
							class:border-gray-300={index > current}
							class:text-gray-400={index > current}
							style={index <= current ? `background-color: ${primary}; border-color: ${primary}; box-shadow: ${index === current ? `0 0 0 3px ${primary}20` : 'none'}` : ''}
						>
							{#if index < current}
								<!-- Checkmark for completed steps -->
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
								</svg>
							{:else}
								<span class="text-sm font-bold">{index + 1}</span>
							{/if}
						</div>
					{/if}
					
					<!-- Step Label -->
					<span 
						class="mt-2 text-xs sm:text-sm font-medium text-center transition-colors duration-200 max-w-16 sm:max-w-none"
						class:text-orange-600={index <= current}
						class:font-semibold={index <= current}
						class:text-gray-500={index > current}
					>
						{step.text}
					</span>
				</div>
				
				<!-- Connector Line -->
				{#if index < steps.length - 1}
					<div 
						class="flex-1 h-0.5 mx-2 sm:mx-4 mt-[-1.5rem] transition-colors duration-300"
						class:bg-orange-500={index < current}
						class:bg-gray-300={index >= current}
						style={index < current ? `background-color: ${primary}` : ''}
					></div>
				{/if}
			</div>
		{/each}
	</div>
</div>