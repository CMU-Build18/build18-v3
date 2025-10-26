<!-- src/lib/components/Alert.svelte -->
<script>
  import { fade } from 'svelte/transition';
  export let message = '';
  export let type = 'info';

  const bgColors = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };
</script>

{#if message}
  <div class={`${bgColors[type]} border-l-4 p-4 mb-4`} role="alert" transition:fade="{{ duration: 200 }}">
    <p class="font-bold">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
    <p>{message}</p>
  </div>
{/if}