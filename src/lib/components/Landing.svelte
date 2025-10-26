<!-- src/lib/components/Landing.svelte -->
<script>
	import { auth } from '../../lib/firebase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let user = null;
	let countdown;
	const deadline = new Date('2024-10-28T23:59:00-04:00');
	let hours = '00';
	let minutes = '00';
	let seconds = '00';

	// fallback landing
	let imageUrl = 'breadboards/build18-breadboard.svg';

	// Array of possible images to display
	let imageUrls = [
		'breadboards/build18-breadboard-01.svg',
		'breadboards/build18-breadboard-02.svg',
		'breadboards/build18-breadboard-03.svg',
		'breadboards/build18-breadboard-04.svg',
		'breadboards/build18-breadboard-05.svg'
	];

	// fallback splash text
	let splashText = 'WELCOME BUILDERS!';

	// Array of possible splash texts
	let splashTexts = [
		'ACCELERATING FIZZBUZZ!',
		"FLEX'EM WRECK'EM!",
		'LIVELIFTING!',
		'WELCOME TO BUILD18!',
		'PLAYING A SCOTTYCHORD!',
		'TAKING A YINZ BUS!',
		'MAY THE DRONES BE WITH YOU!',
		'SPEED TYPING LATEX!',
		'PLAYING SERVO MUSIC!',
		'SOLVING CIRCUITS!',
		'PAINTING WITH LED BRUSHES!',
		'RAISING ROBOTIC KITTENS!',
		'AUGMENTING REALITY!',
		'BREWING PERFECT COFFEE!',
		'DANCING ON PIEZO FLOORS!',
		'FOLLOWING AUTONOMOUS BOTS!',
		'CHARGING WITH SUPERCAPS!',
		'GROWING AUTOMATED GARDENS!',
		'MIXING DJ BEATS!',
		'BUILDING SWARM DRONES!',
		"TANNER'S SCREAMING ORBS!",
		'CONTROLLING WITH GESTURES!',
		'CASTING VR SPELLS!',
		'LAUNCHING ROCKET SHOES!',
		'TRACKING THE SUN!',
		'COMPRESSING SMART BOTTLES!',
		'SHUFFLING MAGIC CARDS!',
		'WRITING ON BOARDS!',
		'SCANNING IN 3D!',
		'PICKING UP PING PONGS!',
		'ORCHESTRATING AIR HORNS!',
		'DELIVERING AERIAL PAYLOADS!',
		'RACING AUTONOMOUS DRONES!',
		'FOLLOWING WIRELESS LUGGAGE!',
		'SORTING ROBOTIC CARDS!',
		'MONITORING CROWD DENSITY!',
		'MIXING ROBOTIC COCKTAILS!',
		'STORING FLYWHEEL ENERGY!',
		'DEFROSTER THE ULTIMATE!',
		'CREATING MARBLE MUSIC!',
		'HIGH FIVING ROBOTS!',
		'WAKE N\' SHAKING!',
		'GARDENING WITH PARDONS!',
		'CHATTING WITH FISH!',
		'PLAYING DISCRETE TIC-TAC-TOE!',
		'RIDING SMARTER SKATEBOARDS!',
		'BUILDING BB8 DROIDS!',
		'CORRECTING ROOM DYNAMICS!',
		'FOLDING ORIGAMI CIRCUITS!',
		'TESLA COILING SOLID STATE!',
		'NAVIGATING AUTONOMOUS UNDERWATER!',
		'HAMMERING WITH MJOLNIR!',
		'DIGGING FOR DATA!',
		'BREWING POUR OVER PERFECTION!',
		'LIFTING WITH FORKLIFTS!',
		'ANALYZING LOCAL WEATHER!',
		'CHARGING BACKPACK POWER!',
		'SEEING WITH EYES OF HANDS!',
		'MIRRORING SMART REFLECTIONS!',
		'ZIGZAGGING WITH ZIPS!',
		'WHEELING AND HEATING!',
		'VOIDING INTELLIGENT DORMS!',
		'BRAKING FOR BUGGIES!',
		'LIGHTING UP THE ROOM!',
		'DEFROSTING ULTIMATE SOLUTIONS!',
		'PHASING RADAR ARRAYS!',
		'SWIMMING WITH FISH ROBOTS!',
		'SIGNING WITH ARDUINO!',
		'TYPING LATEX AT SPEED!',
		'POKEMON STARTING ECE!',
		'SURFING THE WAVES UP!',
		'GLOWING ELECTRAE 9000!',
		'TURRET NERFING AUTOMATED!',
		'ACCELERATING CNN FPGAS!',
		'GARDENING AUTOMAGICALLY!',
		'HEXING THE DISPLAYS!',
		'LAUNDRYING LAZILY!',
		'SURPRISING DAILY JEWELRY!',
		'BANNING THE BAND!',
		'ZAPPING HAPPILY!',
		'GOBSTONING HARRY POTTER!',
		'BOYING THE FPGA!',
		'BARISTA WALL-E SERVING!',
		'BRAILING BUILD18!',
		'ENGINE ANALYZING!',
		'COMPILING BUILD GCC!',
		'EXPENDING MACHINE CALORIES!',
		'DITTOING THE BOTS!',
		'DOODLING WITH E!',
		'WAKING UP ROBOTS!',
		'IDENTIFYING RFID REPLICAS!',
		'MOBILIZING PIANO KEYS!',
		'MAGLEVVING MINI TRAINS!',
		'DEFENDING FROM LANTERNFLIES!',
		'FATHERING BOTS!',
		'VIRTUALIZING SEARCH DESTROY!',
		'SPRAYING TARTAN PAINTS!',
		'COPYING DEEP STRUCTURES!',
		'VECTORING THRUST ROCKETS!',
		'DUMPING PYTHON FILES!',
		'FEEDING SONIC HAPTICS!',
		'MARKING OFF PROCESSORS!',
		'QUADDING THE QUICK!',
		'CURRYING ROBO DISHES!',
		'SCREENING SMART SYSTEMS!',
		'TELESCOPING QUADCOPTERS!',
		'SOLVING RUBIK AUTONOMOUSLY!',
		'MIXING MODAL MUSIC!',
		'DELTTING THE PHI!',
		'MATLESSLY DANCING DDR!',
		'SURFING SUBWAY REAL!',
		'DEALING ROBOT CARDS!',
		'RUBOTING THE BOTS!',
		'CRAFTING BUILD18!',
		'GUITARING ONLY WONDERWALL!',
		'SIGNING ROBO LANGUAGE!',
		'EYEING ROAD SAFELY!',
		'MOZARTONOMIZING MUSIC!',
		'ATTACKING SHEER HIGHLIGHTS!',
		'BUSING THE YINZ!',
		'NACING THE BW!',
		'BOTTING THE 18220!',
		'KERAUNOSING LIGHTNING!',
		'ZEUSING THE GODS!',
		'MIRAGING ILLUSIONS!',
		'CHEGOING THE CHE!',
		'RIDERING THE SERVICE!',
		'CUBING THE LIT!',
		'DIPPERING LITTLE STARS!',
		'INFINIFUNNING FOREVER!',
		'TEAMFLANDING TOGETHER!',
		'SPACETEAMING MISSIONS!',
		'ATARICLONING CLASSICS!',
		'BUILDABOTTING EVERYTHING!',
		'PALMPRECSIONING CONTROLS!',
		'JASONM2ING THE CODE!',
		'MIRING THE PROJECTS!',
		'PHONECARRING MOBILITY!',
		'VIRTUALMEADOWING FIELDS!',
		'TEARIMING THE PERFECT!',
		'FOLLOWBOTTING PATHS!',
		'WALLDDING THE FUTURE!',
		'OMNIBBOARDING EVERYWHERE!',
		'JOKERSORTING ROBOT CARDS!',
		'KARAOKEMACHINING SONGS!',
		'LEDMATRIZING DISPLAYS!',
		'ANDYWAFHOLING ART!',
		'SMARTBALLING INTELLIGENCE!',
		'HOLOGRAMMING PICTOS!',
		'GESDRONING CONTROLS!',
		'NOISYNOTESING SOUNDS!',
		'FPGAPLUSPLUSSING CODE!',
		'DUMDOTPYING SMART!'
	];

	// let splashTexts = ['WELCOME TO 2025-2026 KICKOFF!'];

	// randomly select a splash text to display
	splashText = splashTexts[Math.floor(Math.random() * splashTexts.length)];

	// Randomly select an image to display
	imageUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((currentUser) => {
			user = currentUser;
		});

		// Start the countdown timer
		countdown = setInterval(() => {
			const now = new Date();
			const diff = deadline - now;

			if (diff <= 0) {
				clearInterval(countdown);
				hours = minutes = seconds = '00';
				return;
			}

			// Calculate total hours, minutes, and seconds remaining
			hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
			minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
			seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

			//console.log(`${hours} hours, ${minutes} minutes, ${seconds} seconds`);
		}, 1000);

		return unsubscribe;
	});
</script>

<section
	class="landing relative min-h-screen flex flex-col justify-center items-center text-center"
>
	<div class="absolute top-0 left-0 w-full h-full z-[-1]">
		<img src={imageUrl} alt="Breadboard SVG" class="w-full h-full object-cover" />
	</div>
	<div class="content px-4">
		<div class="text-center">
			<p
				class="text-6xl md:text-9xl font-extrabold bg-clip-text text-transparent bg-[linear-gradient(to_right,theme(colors.purple.400),theme(colors.purple.100),theme(colors.pink.300),theme(colors.orange.400),theme(colors.pink.300),theme(colors.purple.100),theme(colors.purple.400))] bg-[length:200%_auto] animate-gradient"
			>
				BUILD18
			</p>
			<br />
			<!-- Cute array of possible messages -->
			<p
				class="text-3xl md:text-4xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-[linear-gradient(to_right,theme(colors.purple.400),theme(colors.purple.100),theme(colors.pink.300),theme(colors.orange.400),theme(colors.pink.300),theme(colors.purple.100),theme(colors.purple.400))] bg-[length:200%_auto] animate-gradient"
			>
				{splashText}
			</p>
		</div>
	</div>
	<div class="bouncing-arrow absolute bottom-16">
		<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M12 20V4M12 20l4-4m-4 4l-4-4"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	</div>
</section>

<style>
	.bouncing-arrow {
		animation: bounce 1.5s infinite;
	}

	@keyframes bounce {
		0%,
		20%,
		50%,
		80%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(15px);
		}
		60% {
			transform: translateY(10px);
		}
	}
</style>
