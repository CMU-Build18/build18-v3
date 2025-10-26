<script>
	let faqs = [
		{
			question: 'What are tracks?',
			answer:
				'Track 1 is our regular track, we give you 250 bucks (300 with preferred vendors) and you make something cool. Track 2 is our more ambitious track. The budget is higher, though you will have to meet with the officers to ensure that you actually need that extra budget. New this year is Innov18, which adds on to either track, and has you make and pitch a product that has a real-world use case!',
			isOpen: false
		},
		{
			question: 'What are preferred vendors?',
			answer:
				'Preferred vendors are vendors that we have worked with in the past and have a good track record of delivering parts on time. They include Adafruit, Sparkfun, Mouser, Pololu, Digikey, McMaster-Carr, Amazon, Reimbursements and TechSpark Direct Charges.',
			isOpen: false
		},
		{
			question: "What's the maximum team size?",
			answer: '5 people!',
			isOpen: false
		},
		{
			question: "What's the minimum team size?",
			answer: '2 people!',
			isOpen: false
		},
		{
			question: 'Do I have to be an ECE major to participate?',
			answer:
				'Nope! We allow and encourage multi-disciplinary teams, though at least one member must be an ECE major.',
			isOpen: false
		},
		{
			question: 'How many people are allowed to participate in the event?',
			answer:
				'We allow as many teams as we have funding for. In the past, we have had around 100 teams of 2-5 people each.',
			isOpen: false
		},
		{
			question: 'Are there any project restrictions?',
			answer:
				'As long as it does not break any laws or cause people harm you should be good to go. However, if your project uses dangerous chemicals, high powered lasers, etc, then the officers may place extra restrictions on your team in order to ensure safety during build week. In general, however, projects are not restricted to a certain theme or field.',
			isOpen: false
		},
		{
			question: 'How does Build Week work?',
			answer:
				'Build week takes place during the first week of the spring semester. During Build week, we will offer dinner, office hours, and might even host sponsor office hours. For more detailed information be on the lookout for our Build Week calendar.',
			isOpen: false
		},
		{
			question: 'What happens if I cannot participate on Demo Day after registration is closed?',
			answer:
				'Reach out to the officers as soon as possible! While a no-show during Demo-day typically leads to being black-listed from further iterations of Build-18, we understand that life happens so reach out to see if any mitigating actions could be taken.',
			isOpen: false
		},
		{
			question:
				'How can I find inspiration?',
			answer:
				'Take a look at our <a href="/garage" class="text-[#ff8236]">Garage</a> to see past projects from builders!',
			isOpen: false
		}
		// {
		// 	question: '',
		// 	answer: '',
		// 	isOpen: false
		// },
		// {
		// 	question: '',
		// 	answer: '',
		// 	isOpen: false
		// }
	];

	function toggleFaq(index) {
		faqs = faqs.map((faq, i) => {
			if (i === index) {
				return { ...faq, isOpen: !faq.isOpen };
			}
			return faq;
		});
	}
</script>

<section id="faqs" class="faq bg-custom">
	<h2 class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">
		FREQUENTLY ASKED QUESTIONS (FAQs)
	</h2>
	<div class="faq-list">
		{#each faqs as faq, index}
			<div class="faq-item">
				<button class="faq-question" on:click={() => toggleFaq(index)}>
					{faq.question}
					<span class="icon">{faq.isOpen ? '−' : '+'}</span>
				</button>
				{#if faq.isOpen}
					<p>{@html faq.answer}</p>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Button to see our schedule -->
	<div class="text-center mt-8">
		<a
			href="/blog"
			class="px-6 py-4 text-lg font-bold text-white bg-[#ff8236] rounded-md shadow-md hover:shadow-lg transition-shadow duration-200"
		>
			SEE OUR SCHEDULE
		</a>
	</div>
</section>

<style>
	.faq {
		padding: 4rem 2rem;
	}

	h2 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.faq-list {
		max-width: 800px;
		margin: 0 auto;
	}

	.faq-item {
		margin-bottom: 1rem;
	}

	.faq-question {
		width: 100%;
		text-align: left;
		padding: 1rem;
		background-color: #ffffff;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 1rem;
		font-weight: bold;
	}

	.icon {
		font-size: 1.5rem;
	}

	:global(body) {
		background-color: #fff;
	}
	.bg-custom {
		@apply bg-[url('/background.svg')] bg-repeat;
		background-size: 8px 8px;
		background-position: 20px 20px;
	}
</style>
