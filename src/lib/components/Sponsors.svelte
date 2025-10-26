<script>
	const bit8_sponsors = [
		{
			name: 'Optiver',
			logo: '/sponsors/optiver.png',
			website: 'https://optiver.com',
			tier: '8-bit'
		},
		{
			name: 'Astera Labs',
			logo: '/sponsors/astera-labs.png',
			website: 'https://www.asteralabs.com/',
			tier: '8-bit'
		},
		{
			name: 'Tesla',
			logo: '/sponsors/tesla.png',
			website: 'https://www.tesla.com',
			tier: '8-bit'
		},
		{
			name: 'Hudson River Trading',
			logo: '/sponsors/hudson-river-trading.png',
			website: 'https://www.hudsonrivertrading.com',
			tier: '8-bit'
		},

		{
			name: 'Ford',
			logo: '/sponsors/ford.png',
			website: 'https://www.ford.com',
			tier: '8-bit'
		},
		{
			name: 'Smolens Endowment',
			logo: '/sponsors/smolens-endowment.png',
			website: '',
			tier: '8-bit'
		},
		{
			name: 'KEEN',
			logo: '/sponsors/keen.png',
			website: 'https://engineeringunleashed.com',
			tier: '8-bit'
		},
		{
			name: 'Nucor',
			logo: '/sponsors/nucor.png',
			website: 'https://www.nucor.com',
			tier: '8-bit'
		}
	];

	const bit16_sponsors = [
		{
			name: 'Johns Hopkins APL',
			logo: '/sponsors/johns-hopkins.png',
			website: 'https://www.jhuapl.edu/',
			tier: '16-bit'
		},
		{
			name: 'Caterpillar',
			logo: '/sponsors/caterpillar.png',
			website: 'https://www.caterpillar.com',
			tier: '16-bit'
		},
		{
			name: 'General Motors',
			logo: '/sponsors/general-motors.png',
			website: 'https://www.gm.com',
			tier: '16-bit'
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
			href="/sponsor-packet.pdf"
			download="Build18 Sponsorship Packet"
			class="relative text-center px-6 py-3 text-[#ff8236] font-bold uppercase border-2 border-[#ff8236] rounded-md transition duration-300 ease-in-out shadow-[0_0_15px_rgba(255,130,54,0.5)] hover:bg-[#ff8236] hover:text-white hover:shadow-[0_0_30px_rgba(255,130,54,0.8)] before:content-[''] before:absolute before:inset-[-5px] before:rounded-md before:bg-[rgba(255,130,54,0.5)] before:opacity-0 hover:before:opacity-100 before:transition before:duration-300"
		>
			See our prospectus
		</a> -->
	</div>

	<div class="container mx-auto px-4 md:px-8">
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
