<script>
	const bit32_sponsors = [
		{
			name: 'Annapurna Labs',
			logo: '/sponsors/annapurna-labs.png',
			website: 'https://www.linkedin.com/company/annapurna-labs/',
			tier: '32-bit'
		},
		{
			name: 'Astera Labs',
			logo: '/sponsors/astera-labs.png',
			website: 'https://www.asteralabs.com/',
			tier: '32-bit'
		}
	];

	const bit16_sponsors = [
		{
			name: 'Hudson River Trading',
			logo: '/sponsors/hudson-river-trading.png',
			website: 'https://www.hudsonrivertrading.com',
			tier: '16-bit'
		}
	];

	const bit8_sponsors = [
		{
			name: 'Rivian',
			logo: '/sponsors/rivian.png',
			website: 'https://rivian.com',
			tier: '8-bit'
		},
		{
			name: 'Nucor',
			logo: '/sponsors/nucor.png',
			website: 'https://www.nucor.com',
			tier: '8-bit'
		},
		{
			name: 'Marshall Wace',
			logo: '/sponsors/marshall-wace.png',
			website: 'https://www.mwam.com',
			tier: '8-bit'
		},
		{
			name: 'STR',
			logo: '/sponsors/str.png',
			website: 'https://str.us',
			tier: '8-bit'
		},
		{
			name: 'Caterpillar',
			logo: '/sponsors/caterpillar.png',
			website: 'https://www.caterpillar.com',
			tier: '8-bit'
		}
	];

	const partners = [
		{
			name: 'Carnegie Mellon University',
			logo: '/sponsors/cmu.png',
			website: 'https://www.cmu.edu',
			tier: 'Thank You!'
		},
		{
			name: 'Electrical and Computer Engineering Department',
			logo: '/sponsors/ece.png',
			website: 'https://www.ece.cmu.edu',
			tier: 'Thank You!'
		}
	];
</script>

<section id="sponsors" class="bg-custom py-16">
	<h2 class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">
		OUR SPONSORS
	</h2>

	<div class="min-w-md mb-8 mx-auto lg:px-48 xl:px-64 px-12 justify-center">
		<p class="text-center">
			Build18 would not be possible without the support of our partners. We are entirely student-run
			and primarily supported by corporate donations. We pride ourselves on exhibiting the top
			electrical and computer engineering students in the nation through Build Week, Symposium, and
			mini events. If you are interested in sponsoring, please get in touch with our team at
			<a href="mailto:build18@ece.cmu.edu" class="text-[#ff8236] font-bold"
				>build18@ece.cmu.edu</a
			>!
		</p>
	</div>

	<div class="flex justify-center mb-16">
		<!-- <a
			href="/sponsor-packet-2027.pdf"
			download="Build18 2027 Sponsorship Packet"
			class="relative text-center px-6 py-3 text-[#ff8236] font-bold uppercase border-2 border-[#ff8236] rounded-md transition duration-300 ease-in-out shadow-[0_0_15px_rgba(255,130,54,0.5)] hover:bg-[#ff8236] hover:text-white hover:shadow-[0_0_30px_rgba(255,130,54,0.8)] before:content-[''] before:absolute before:inset-[-5px] before:rounded-md before:bg-[rgba(255,130,54,0.5)] before:opacity-0 hover:before:opacity-100 before:transition before:duration-300"
		>
			See our prospectus
		</a> -->
	</div>

	<div class="container mx-auto px-4 md:px-8">
		<!-- 32-bit sponsors -->
		<div class="mb-12">
			<h2 class="text-4xl font-extrabold text-orange-500 text-center mb-6">32-bit</h2>
			<div class="flex flex-wrap justify-center gap-8 mx-auto max-w-screen-xl">
				{#each bit32_sponsors as sponsor, index}
					<a href={sponsor.website} target="_blank" rel="noopener noreferrer">
						<div
							class="bg-transparent rounded-lg p-6 text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
						>
							<img class="mx-auto w-48 h-48 object-contain" src={sponsor.logo} alt={sponsor.name} />
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- 16-bit sponsors -->
		<div class="mb-12">
			<h2 class="text-4xl font-extrabold text-orange-500 text-center mb-6">16-bit</h2>
			<div class="flex flex-wrap justify-center gap-8 mx-auto max-w-screen-xl">
				{#each bit16_sponsors as sponsor, index}
					<a href={sponsor.website} target="_blank" rel="noopener noreferrer">
						<div
							class="bg-transparent rounded-lg p-6 text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
						>
							<img class="mx-auto w-48 h-48 object-contain" src={sponsor.logo} alt={sponsor.name} />
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- 8-bit sponsors -->
		<div class="mb-12">
			<h2 class="text-4xl font-extrabold text-orange-500 text-center mb-6">8-bit</h2>
			<div class="flex flex-wrap justify-center gap-8 mx-auto max-w-screen-xl">
				{#each bit8_sponsors as sponsor, index}
					<a href={sponsor.website} target="_blank" rel="noopener noreferrer">
						<div
							class="bg-transparent rounded-lg p-6 text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
						>
							<img class="mx-auto w-48 h-48 object-contain" src={sponsor.logo} alt={sponsor.name} />
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Thank you! -->
		<div class="mb-12">
			<h2 class="text-4xl font-extrabold text-orange-500 text-center mb-6">Thank You!</h2>
			<div class="flex flex-wrap justify-center gap-8 mx-auto max-w-screen-xl">
				{#each partners as sponsor, index}
					<a href={sponsor.website} target="_blank" rel="noopener noreferrer">
						<div
							class="bg-transparent rounded-lg p-6 text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
						>
							<img class="mx-auto w-48 h-48 object-contain" src={sponsor.logo} alt={sponsor.name} />
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</section>

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
