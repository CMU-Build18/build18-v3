<script>
	const projects = [
		{
			name: 'Yinz Bus',
			image: '/about/004.jpg',
			link: 'https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335'
		},
		{
			name: 'Matless DDR',
			image: '/about/001.jpg',
			link: 'https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335'
		},
		{
			name: "Flex 'em Wrecks 'em Robots!",
			image: '/about/003.jpg',
			link: 'https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335'
		},
		{
			name: 'Guitar That Only Plays Wonderwall',
			image: '/about/002.jpg',
			link: 'https://www.flickr.com/photos/cmu-ece/albums/72177720314674377/with/53519407335'
		}
	];
</script>

<section id="about" class="h-max bg-custom">
	<div class="py-6 sm:py-8 lg:py-12">
		<div class="mx-auto max-w-screen-xl px-4 md:px-8 pt-12">
			<div class="mb-10 md:mb-16">
				<h2 class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">
					WHO ARE WE?
				</h2>
				<p class="mx-auto max-w-screen-l text-center text-gray-500 md:text-lg italic">
					"Build18 is where creativity, curiosity and engineering intersect. It's a chance for every
					innovator at Carnegie Mellon — every student and faculty member with a passion for
					invention — to make and break things together in pursuit of new ideas." - Cyrus Tabrizi
				</p>
				<p class="mx-auto max-w-screen-l text-center text-gray-500 md:text-lg pt-8">
					We are an annual engineering festival held by the Electrical and Computer Engineering
					department and run by students. Build18 was founded out of the belief that curriculum is
					too structured - there just isn't enough room for simply tinkering with electronics and
					making cool stuff. Hope to see you soon!
				</p>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 xl:gap-8 px-12">
			{#each projects as project}
				<a
					href={project.link}
					target="_blank"
					class="group relative flex h-32 items-end overflow-hidden rounded-lg bg-gray-100 shadow-lg {project.name ===
						'Matless DDR' || project.name === "Flex 'em Wrecks 'em Robots!"
						? 'md:col-span-2'
						: ''} md:h-80"
				>
					<img
						src={project.image}
						loading="lazy"
						alt={project.name}
						class="absolute inset-0 h-full w-full object-cover object-center transition duration-200 group-hover:scale-110"
					/>
					<div
						class="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent opacity-50"
					></div>
					<span class="relative ml-4 mb-3 inline-block text-sm text-white md:ml-5 md:text-lg"
						>{project.name}</span
					>
				</a>
			{/each}
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
