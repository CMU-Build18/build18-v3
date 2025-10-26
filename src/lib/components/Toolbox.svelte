<script>
	import { Mail, Home, Instagram, Smartphone } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-gradient-to-b from-orange-400 to-orange-100 relative pt-20 bg-custom">
	<div class="relative z-10 max-w-6xl mx-auto px-4 py-12">
		<h1 class="text-6xl font-extrabold text-center text-orange-500 mb-12">TOOLBOX</h1>
		<div class="max-w-4xl mx-auto text-center">
			<img src="/blog/011.png" alt="Toolbox" class="mx-auto rounded-lg max-w-xl" />
			<p class="mt-8 text-lg text-gray-900 max-w-2xl mx-auto text-justify">
				Build18 is where creativity, curiosity and engineering intersect at Carnegie Mellon
				University. Our Toolbox showcases past projects for inspiration, our schedule for upcoming
				workshops, and allows for quick check-in during Build Week!
			</p>
			<p class="mt-8 text-lg text-gray-900 max-w-2xl mx-auto text-justify">
				For questions, feedback, or to report a bug, please email us at <a
					href="mailto:build18@ece.cmu.edu"
					class="text-orange-500">build18@ece.cmu.edu</a
				>, reach out to us on the Build18 2025 Discord server, or contact one of our officers.
			</p>
			<div class="mt-8 flex justify-center">
				<div class="flex flex-col space-y-4">
					<!-- <a
						href="#"
						class="block px-6 py-3 text-orange-500 border-2 border-orange-500 rounded-lg font-semibold text-center max-w-2xl text-xl hover:bg-orange-200"
					>
						Download for iOS on App Store
					</a>
					<a
						href="#"
						class="block px-6 py-3 text-orange-500 border-2 border-orange-500 rounded-lg font-semibold text-center max-w-2xl text-xl hover:bg-orange-200"
					>
						Download APK for Android
					</a> -->
				</div>
			</div>
			<!-- Privacy Policy -->
			<div class="my-8">
				<a href="https://build18.org/privacy" class="text-orange-500 text-xl">Privacy Policy</a>
			</div>

			<!-- Social Media Links -->
			<div class="mt-4 text-center">
				<div class="flex justify-center space-x-6">
					<a
						href="https://build18.org"
						class="text-orange-500 hover:text-orange-200 transition-colors"
					>
						<Home size="24" stroke-width="2" class="lucide lucide-home" />
					</a>
					<a
						href="https://instagram.com/build.18"
						class="text-orange-500 hover:text-orange-200 transition-colors"
					>
						<Instagram size="24" stroke-width="2" class="lucide lucide-instagram" />
					</a>
					<a
						href="mailto:build18@ece.cmu.edu"
						class="text-orange-500 hover:text-orange-200 transition-colors"
					>
						<Mail size="24" stroke-width="2" class="lucide lucide-mail" />
					</a>
					<a
						href="https://build18.org/toolbox"
						class="text-orange-500 hover:text-orange-200 transition-colors"
					>
						<Smartphone size="24" stroke-width="2" class="lucide lucide-mail" />
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
