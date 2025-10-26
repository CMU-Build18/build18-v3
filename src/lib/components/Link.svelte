<script>
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	let qrCodeDataUrl;
	let destinationLink = 'https://build18.org/poster';
	let darkColor = '#000000';
	let lightColor = '#FFFFFF';
	let centerImage = '';
	let centerImageSize = 0.2; 
	let warning = '';
	let copied = false;
	let selectedColorTarget = 'qrcode';

	const eventColors = {
		orange: '#FB7F37',
		blue: '#39A0ED',
		white: '#FFFFFF',
		black: '#000000',
		transparent: 'transparent'
	};

	function setColor(colorName) {
		const color = eventColors[colorName];
		if (selectedColorTarget === 'qrcode') {
			darkColor = color;
		} else {
			lightColor = color;
		}
		checkContrast();
	}

	function checkDomain() {
		try {
			const url = new URL(destinationLink);
			if (!url.hostname.endsWith('build18.org')) {
				warning = 'Warning: The link is not within the build18.org domain.';
			} else {
				warning = '';
			}
		} catch (error) {
            warning = 'Warning: The link is not within the build18.org domain.';
		}
	}

	function checkContrast() {
		if (darkColor === 'transparent' || lightColor === 'transparent') {
			warning = '';
			return;
		}
		const contrast = getContrastRatio(darkColor, lightColor);
		if (contrast < 4.5) {
			warning = 'Warning: The color contrast may be too low for easy scanning.';
		} else {
			warning = '';
		}
	}

	let selectedColor;
	$: selectedColor = selectedColorTarget === 'qrcode' ? darkColor : lightColor;

	function updateColor(event) {
		if (selectedColorTarget === 'qrcode') {
			darkColor = event.target.value;
		} else {
			lightColor = event.target.value;
		}
		checkContrast();
	}

	function getContrastRatio(color1, color2) {
		const getLuminance = (color) => {
			const rgb = parseInt(color.slice(1), 16);
			const r = (rgb >> 16) & 0xff;
			const g = (rgb >> 8) & 0xff;
			const b = (rgb >> 0) & 0xff;
			const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
			return luminance <= 0.03928 ? luminance / 12.92 : Math.pow((luminance + 0.055) / 1.055, 2.4);
		};
		const l1 = getLuminance(color1);
		const l2 = getLuminance(color2);
		return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
	}

	async function generateQRCode() {
		checkDomain();
		checkContrast();
		const canvas = document.createElement('canvas');
		await QRCode.toCanvas(canvas, destinationLink, {
			width: 500,
			margin: 2,
			color: {
				dark: darkColor === 'transparent' ? '#00000000' : darkColor,
				light: lightColor === 'transparent' ? '#FFFFFF00' : lightColor
			}
		});

		if (centerImage) {
			const ctx = canvas.getContext('2d');
			const img = new Image();
			img.onload = () => {
				const size = canvas.width * centerImageSize;
				const x = (canvas.width - size) / 2;
				const y = (canvas.height - size) / 2;
				ctx.drawImage(img, x, y, size, size);
				qrCodeDataUrl = canvas.toDataURL();
			};
			img.src = centerImage;
		} else {
			qrCodeDataUrl = canvas.toDataURL();
		}
	}

	function handleImageUpload(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				centerImage = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(qrCodeDataUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}

	onMount(() => {
		generateQRCode();
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4 pt-24">
	<div class="w-full max-w-md space-y-4">
		<input
			type="text"
			bind:value={destinationLink}
			on:input={checkDomain}
			placeholder="Enter destination link"
			class="w-full p-2 border rounded"
		/>
		<div class="flex space-x-2">
			<select bind:value={selectedColorTarget} class="w-1/2 p-2 border rounded">
				<option value="qrcode">QR Code Color</option>
				<option value="background">Background Color</option>
			</select>
			<input
				type="color"
				bind:value={selectedColor}
				on:input={updateColor}
				class="w-1/2"
				disabled={selectedColorTarget === 'qrcode'
					? darkColor === 'transparent'
					: lightColor === 'transparent'}
			/>
		</div>
		<div class="flex space-x-2">
			{#each Object.entries(eventColors) as [name, color]}
				<button
					on:click={() => setColor(name)}
					class="flex-1 p-2 text-white rounded"
					style="background-color: {color === 'transparent' ? 'white' : color}; {color ===
					'transparent'
						? 'border: 4px solid black;'
						: ''}"
				>
					{name}
				</button>
			{/each}
		</div>
		<input
			type="file"
			accept="image/*"
			on:change={handleImageUpload}
			class="w-full p-2 border rounded"
		/>
		<input
			type="range"
			bind:value={centerImageSize}
			min="0.1"
			max="0.5"
			step="0.1"
			class="w-full"
		/>
		<button
			on:click={generateQRCode}
			class="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600"
		>
			Generate QR Code
		</button>
	</div>
	{#if warning}
		<p class="mt-4 text-red-500">{warning}</p>
	{/if}
	{#if qrCodeDataUrl}
		<button
			on:click={copyToClipboard}
			class="mt-4 p-2 bg-green-500 text-white rounded hover:bg-green-600"
		>
			{copied ? 'Copied!' : 'Copy to Clipboard'}
		</button>
		<img src={qrCodeDataUrl} alt="QR Code" class="mt-8 max-w-full" />
	{/if}
</div>
