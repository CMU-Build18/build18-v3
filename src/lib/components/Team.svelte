<script>
	let activeTab = 'current';

	const currentMembers = [
		{
			name: 'Siena Lee',
			roles: ['Co-President'],
			linkedin: 'https://www.linkedin.com/in/sienahlee',
			photo: '/members/siena-lee.jpg'
		},
		{
			name: 'Rucha Kurani',
			roles: ['Co-President'],
			linkedin: 'https://www.linkedin.com/in/rucha-kurani-3515b5239/',
			photo: '/members/rucha-kurani.jpg'
		},
		{
			name: 'Michelle Chen',
			roles: ['Co-Chair of Events'],
			linkedin: 'https://www.linkedin.com/in/michelle-chen-08804a241/',
			photo: '/members/michelle-chen.JPG'
		},
		{
			name: 'Vivaan Sawant',
			roles: ['Co-Chair of Sponsorship'],
			linkedin: 'https://www.linkedin.com/in/vivaan-sawant008/',
			photo: '/members/vivaan-sawant.png'
		},
		{
			name: 'Amulya Meduri',
			roles: ['Co-Chair of Sponsorship'],
			linkedin: 'https://www.linkedin.com/in/amulya-meduri/',
			photo: '/members/amulya-meduri.jpg'
		},
		{
			name: 'Devika Manohar',
			roles: ['Co-Chair of Sponsorship'],
			linkedin: 'https://www.linkedin.com/in/devika-manohar/',
			photo: '/members/devika-manohar.jpg'
		},
		{
			name: 'Adriana Holtzman',
			roles: ['Co-Chair of Web Development'],
			linkedin: 'https://www.linkedin.com/in/adriana-holtzman',
			photo: '/members/adriana-holtzman.jpg'
		},
		{
			name: 'Advika Vuppala',
			roles: ['Co-Chair of Web Development'],
			linkedin: 'https://www.linkedin.com/in/advikav/',
			photo: '/members/advika-vuppala.jpg'
		},
		{
			name: 'Berin Celik',
			roles: ['Co-Chair of Media & Communications'],
			linkedin: 'https://www.linkedin.com/in/berin-celik/',
			photo: '/members/berin-celik.jpg'
		},
		{
			name: 'Sanya Ahuja',
			roles: ['Co-Chair of Media & Communications'],
			linkedin: 'https://www.linkedin.com/in/sanyaahuja/',
			photo: '/members/sanya-ahuja.jpg'
		},
		{
			name: 'Ashley Lee',
			roles: ['Chair of Treasury & Logistics'],
			linkedin: 'https://www.linkedin.com/in/ting-yu-lee-47b59a2b8/',
			photo: '/members/ashley-lee.jpg'
		},
		{
			name: 'Bill Nace',
			roles: ['Faculty Mentor'],
			photo: '/members/bill-nace.jpg'
		}
	];
	const alumniMembers = [
		{
			name: 'Perrin Tong',
			roles: ['Co-President'],
			github: 'https://github.com/perrintong325',
			linkedin: 'https://www.linkedin.com/in/perrintong',
			photo: '/members/perrin-tong.jpg'
		},
		{
			name: 'Varun Kumar',
			roles: ['Co-President'],
			linkedin: 'https://www.linkedin.com/in/varunkumar314',
			photo: '/members/varun-kumar.jpg'
		},
		{
			name: 'Jongyup (Jeff) Kim',
			roles: ['Sponsorship & Event Planning'],
			linkedin: 'https://www.linkedin.com/in/jongyup-kim-7397571b5',
			photo: '/members/jeff-kim.jpg'
		},
		{
			name: 'Michelle Heo',
			roles: ['Co-Chair of Events'],
			photo: '/members/michelle-heo.jpg'
		},
		{
			name: 'MM Demangone',
			roles: ['Event Planning & External Communications'],
			linkedin: 'https://www.linkedin.com/in/mmdemangone',
			photo: '/members/mm-demangone.jpg'
		},
		{
			name: 'Nicole Feng',
			roles: ['Website & Sponsorship'],
			linkedin: 'https://www.linkedin.com/in/nvfeng',
			photo: '/members/nicole-feng.jpg'
		},
		{
			name: 'Quinn Roberts',
			roles: ['Website & Creative Media'],
			linkedin: 'https://www.linkedin.com/in/quinn-roberts-805933287',
			photo: '/members/quinn-roberts.jpg'
		},
		{
			name: 'Sebastian Perez',
			roles: ['Tech Talks & Parts Ordering'],
			linkedin: 'https://www.linkedin.com/in/saperezv',
			photo: '/members/sebastian-perez.jpg'
		},
		{
			name: 'Siddharth Singh',
			roles: ['Tech Talks & Parts Ordering'],
			linkedin: 'https://www.linkedin.com/in/sidsingh2903',
			photo: '/members/siddharth-singh.jpg'
		},
		{
			name: 'Jeffery John',
			roles: ['Website, Mobile & Infrastructure'],
			github: 'https://github.com/jefferyjohn',
			linkedin: 'https://www.linkedin.com/in/jefferyjohn',
			photo: '/members/jeffery-john.jpg'
		},
		{
			name: 'Thomas Kang',
			roles: ['Co-President'],
			linkedin: 'https://www.linkedin.com/in/thomas-kang3/',
			photo: '/members/thomas-kang.jpg'
		},
		{
			name: 'David Wu',
			roles: ['Co-President'],
			linkedin: 'https://www.linkedin.com/in/david-wu-cmu2024/',
			photo: '/members/david-wu.jpg'
		},
		{
			name: 'Zhejia Yang',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/zhejia-yang-b78109283/',
			photo: '/members/zhejia-yang.jpg'
		},
		{
			name: 'Ben Sun',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/ben-sun-3287b5248/',
			photo: '/members/ben-sun.jpg'
		},
		{
			name: 'Jason Kim',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/jaesup-kim/',
			photo: '/members/jaesup-kim.jpg'
		},
		{
			name: 'Claire Hu',
			roles: ['President'],
			photo: '/members/default.jpg'
		},
		{
			name: 'Michael Li',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Annie Eng',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Fayyaz Zaidi',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Andy Kong',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Sandra Sajeev',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'James Garcia',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Bari Guzikowski',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/barimguzikowski',
			photo: '/members/bari-mguzikowski.jpg'
		},
		{
			name: 'Advaith Sethuraman',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/advaith-sethuraman/',
			photo: '/members/advaith-sethuraman.jpg'
		},
		{
			name: 'Enes Palaz',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/enespalaz/',
			photo: '/members/enes-palaz.jpg'
		},
		{
			name: 'Ilan Biala',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/ilanbiala/',
			photo: '/members/ilan-biala.jpg'
		},
		{
			name: 'Ryan Oh',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Bolaji Banole',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Cindy Deng',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/cindydeng98/',
			photo: '/members/cindy-deng.jpg'
		},
		{
			name: 'Carlos Gonzalez',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Cyrus Tabrizi',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Aaron Reyes',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Brandon Perez',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Brandon Schmuck',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/brandon-schmuck/',
			photo: '/members/brandon-schmuck.jpg'
		},
		{
			name: 'Hale Konopka',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/halekonopka/',
			photo: '/members/hale-konopka.jpg'
		},
		{
			name: 'John Lore',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/jlore/',
			photo: '/members/john-lore.jpg'
		},
		{
			name: 'Lucas Bruder',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/lucasbruder/',
			photo: '/members/default.jpg'
		},
		{
			name: 'Robert Rudolph',
			roles: [''],
			photo: '/members/default.jpg'
		},
		{
			name: 'Sam Westenberg',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/swestenberg/',
			photo: '/members/sam-westenberg.jpg'
		},
		{
			name: 'Taichi Akiyama',
			roles: [''],
			linkedin: 'https://www.linkedin.com/in/taichi-akiyama-699079137/',
			photo: '/members/taichi-akiyama.jpg'
		}
	];
</script>

<section id="team" class="py-8 text-center bg-custom">
	<h2 class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">
		MEET THE OFFICERS
	</h2>

	<div class="flex justify-center mb-8">
		<button
			class="px-4 py-2 mx-2 rounded bg-gray-200 hover:bg-gray-300"
			class:bg-gray-800={activeTab === 'current'}
			class:text-white={activeTab === 'current'}
			on:click={() => (activeTab = 'current')}
		>
			Current
		</button>
		<button
			class="px-4 py-2 mx-2 rounded bg-gray-200 hover:bg-gray-300"
			class:bg-gray-800={activeTab === 'alumni'}
			class:text-white={activeTab === 'alumni'}
			on:click={() => (activeTab = 'alumni')}
		>
			Alumni
		</button>
	</div>

	<div
		class="grid grid-cols-2 px-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:px-32 lg:px-32 xl:px-32 px-4"
	>
		{#each activeTab === 'current' ? currentMembers : alumniMembers as member}
			<div class="bg-gray-100 p-6 rounded shadow">
				<img src={member.photo} alt={member.name} class="w-full h-auto rounded-full mb-4" />
				<h3 class="md:text-xl lg:text-xl xl:text-xl text-lg mb-2">{member.name}</h3>
				{#if member.roles.length > 0}
					<ul class="text-sm text-gray-600 mb-4">
						{#each member.roles as role}
							<li>{role}</li>
						{/each}
					</ul>
				{/if}
				<div class="flex justify-center gap-4">
					{#if member.github}
						<a
							href={member.github}
							target="_blank"
							rel="noopener noreferrer"
							class="text-gray-800 hover:underline"
						>
							<img src="/github.svg" alt="GitHub" class="w-6 h-6" />
						</a>
					{/if}
					{#if member.linkedin}
						<a
							href={member.linkedin}
							target="_blank"
							rel="noopener noreferrer"
							class="text-gray-800 hover:underline"
						>
							<img src="/linkedin.svg" alt="LinkedIn" class="w-6 h-6" />
						</a>
					{/if}
				</div>
			</div>
		{/each}
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
