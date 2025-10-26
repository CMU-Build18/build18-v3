<!-- src/lib/components/dashboard -->
<script>
	import { onMount } from 'svelte';
	import { auth, db } from '../firebase';
	import {
		doc,
		getDoc,
		setDoc,
		updateDoc,
		collection,
		query,
		where,
		getDocs,
		addDoc,
		orderBy
	} from 'firebase/firestore';
	import {
		getStorage,
		ref,
		uploadBytes,
		getDownloadURL,
		listAll,
		getMetadata
	} from 'firebase/storage';

	import { fade, fly, slide } from 'svelte/transition';
	import BulkPasteModal from './BulkPasteModal.svelte';
	import Alert from './Alert.svelte';
	import DiscordLink from '$lib/components/DiscordLink.svelte';
	import Steps from './Steps.svelte';
	import QRCode from 'qrcode';
	import { browser } from '$app/environment';
	import { on } from 'svelte/events';

	let isAdmin = false;
	let currentUser;

	let user;
	let userData = null;
	let teamMembers = [];
	let firstName = '';
	let lastName = '';
	let andrewId = '';
	let discord = '';
	let classYear = '';
	let school = '';
	let majorProgram = '';
	let shirtSize = '';
	let dietaryConsiderations = '';
	let gender = '';
	let ethnicity = '';
	let track = '';
	let track1 = false;
	let track2 = false;
	let innov18 = false;
	let buildIntent = '';
	let preliminaryParts = '';

	let teamName = '';
	let hasTeamName = false;

	let joinTeamId = '';
	let joinTeamName = '';
	let joinTeamPassword = '';
	let newTeamName = '';
	let newTeamPassword = '';
	let alertMessage = '';
	let alertType = '';
	let isLoading = false;

	let isProfileExpanded = false;
	let isTeamExpanded = false;
	let isProjectExpanded = false;

	// RSVP-related variables
	let rsvps = [];
	let drink = 'Walk-In';
	let rsvp926 = false;
	let rsvp104 = false;
	let checkedIn = false;
	let qrCodeImage = '';
	let userDocId = '';

	// Project-related variables
	let title = '';
	let year = '2026';
	let detail = '';
	let featured = false;
	let awards = '';
	let extendedDetails = '';
	let teamProfiles = [{ username: '', name: '' }];
	let partsAndCosts = [];
	let image = '';
	let images = [];
	let attachments = [];
	let submissionStatus = '';
	let team = '';
	let draftId = null;
	let showBulkPasteModal = false;

	let projectId = null;

	let qrCode = '';
	let qrCodeDataUrl = '';

	let hasSignedContract = false;

	let searchingFulltime = false;
	let searchingInternship = false;
	let startDates = [];

	let userVerified = false;

	let uploadedImages = [];
	let shortLink = '';
	let linkedin = '';
	let github = '';
	let personalWebsite = '';
	let bio = '';

	// Past teams and projects data
	let pastTeams = [];
	let allProjects = [];
	let pastTeamsData = [];
	let allProjectsData = [];

	// Calendar events data
	let calendarEvents = [];
	let upcomingEvents = [];

	$: if (userData && userData.contractURL) {
		hasSignedContract = true;
	}

	// Function to clean up duplicate members in a team and fix membership issues
	async function cleanupTeamDuplicates() {
		if (userData && userData.teamId) {
			try {
				const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
				if (teamDoc.exists()) {
					const teamData = teamDoc.data();
					const members = teamData.members || [];
					const uniqueMembers = [...new Set(members)];

					// Ensure current user is in the team
					if (!uniqueMembers.includes(user.uid)) {
						uniqueMembers.push(user.uid);
					}

					// Only update if there were changes
					if (members.length !== uniqueMembers.length || !members.includes(user.uid)) {
						await updateDoc(doc(db, 'teams', userData.teamId), {
							members: uniqueMembers
						});
						console.log('Fixed team membership issues');
					}
				}
			} catch (error) {
				console.warn('Error cleaning up team duplicates:', error);
			}
		}
	}

	// Function to manually refresh team data (for debugging/fixing issues)
	async function refreshTeamData() {
		if (isLoading || isLoadingTeamMembers) {
			console.log('Already loading, skipping refresh...');
			return;
		}

		isLoading = true;
		try {
			await cleanupTeamDuplicates();
			await loadTeamMembers();
			showAlert('Team data refreshed successfully!', 'success');
		} catch (error) {
			console.error('Error refreshing team data:', error);
			showAlert('Error refreshing team data. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		isLoading = true;
		auth.onAuthStateChanged(async (authUser) => {
			if (authUser) {
				user = authUser;
				try {
					// Load user data first
					await loadUserData();
					// Then load team members (which will handle cleanup if needed)
					await loadTeamMembers();
					// Load other data in parallel
					await Promise.all([fetchTeamsAndProjects(), loadCalendarEvents(), loadDraft()]);

					// Now show appropriate alerts after data is loaded
					if (userData && (!userData.firstName || !userData.andrewId)) {
						showAlert('Please fill out your profile information.', 'info');
					}

					if (userData && !userData.teamId) {
						showAlert('Please join or create a team.', 'info');
					}

					if (userData && userData.teamId && !draftId) {
						showAlert('Consider starting your project draft!', 'info');
					}

					// Check for newer uploaded files after a short delay to avoid overwhelming the user with alerts
					setTimeout(() => {
						checkForNewerUploads();
					}, 2000);
				} catch (error) {
					console.error('Error loading dashboard data:', error);
					showAlert('Error loading dashboard. Please refresh the page.', 'error');
				}
			}
			isLoading = false;
		});

		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		const uid = urlParams.get('state');

		console.log('Code:', code);
		console.log('UID:', uid);

		if (code && uid) {
			try {
				const response = await fetch(`/api/link-discord?code=${code}&uid=${uid}`);
				const result = await response.json();

				if (result.success) {
					alert('Discord account linked successfully!');
					window.location.href = '/dashboard'; // Redirect back to the dashboard
				} else {
					alert('Failed to link Discord account.');
				}
			} catch (error) {
				console.error('Error linking Discord:', error);
			}
		}

		document.addEventListener('paste', handleImagePaste);
		return () => {
			document.removeEventListener('paste', handleImagePaste);
		};
	});

	async function loadUserData() {
		try {
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			userDocId = userDoc.id;

			userData = userDoc.data();
			firstName = userData.firstName || '';
			lastName = userData.lastName || '';
			andrewId = userData.andrewId || '';
			classYear = userData.classYear || '';
			school = userData.school || '';
			majorProgram = userData.majorProgram || '';
			shirtSize = userData.shirtSize || '';
			dietaryConsiderations = userData.dietaryConsiderations || '';
			gender = userData.gender || '';
			ethnicity = userData.ethnicity || '';
			track = userData.track || '';
			track1 = userData.track1 || false;
			track2 = userData.track2 || false;
			innov18 = userData.innov18 || false;
			buildIntent = userData.buildIntent || '';
			preliminaryParts = userData.preliminaryParts || '';
			discord = userData.discord || '';
			rsvps = userData.rsvps || [];
			rsvp926 = userData.rsvp926 || false;
			rsvp104 = userData.rsvp104 || false;
			drink = userData.drink || '';
			checkedIn = userData.checkedIn || false;
			pastTeams = userData.pastTeams || [];
			allProjects = userData.allProjects || [];
			searchingFulltime = userData.searchingFulltime || false;
			searchingInternship = userData.searchingInternship || false;
			startDates = userData.startDates || [];
			linkedin = userData.linkedin || '';
			github = userData.github || '';
			personalWebsite = userData.personalWebsite || '';
			bio = userData.bio || '';
			shortLink = userData.shortLink || '';

			if (userData.qrCodeDataUrl) {
				qrCodeDataUrl = userData.qrCodeDataUrl;
			} else {
				await generateQRCode();
			}

			if (!userDoc.data().rsvp926) {
				await updateDoc(doc(db, 'users', user.uid), { rsvp926: false });
			}
			if (!userDoc.data().rsvp104) {
				await updateDoc(doc(db, 'users', user.uid), { rsvp104: false });
			}
			if (!userDoc.data().rsvps) {
				await updateDoc(doc(db, 'users', user.uid), { rsvps: [] });
			}

			if (userDoc.data().verified) {
				userVerified = true;
			}

			// Update dashboard visit timestamps
			await updateDashboardVisit();
		} catch (error) {
			showAlert('Error loading user data. Please try again.', 'error');
		}
	}

	async function updateProfile() {
		isLoading = true;
		try {
			const updateData = {
				firstName,
				lastName,
				andrewId,
				discord,
				classYear,
				school,
				majorProgram,
				shirtSize,
				dietaryConsiderations,
				gender,
				ethnicity,
				rsvp926,
				rsvp104,
				rsvps,
				qrCodeDataUrl,
				checkedIn,
				drink,
				searchingFulltime,
				searchingInternship,
				startDates,
				linkedin,
				github,
				personalWebsite,
				bio,
				shortLink,
				lastUpdated: new Date()
			};

			// Preserve contractURL and resumeURL if they exist
			if (userData && userData.contractURL) {
				updateData.contractURL = userData.contractURL;
			}
			if (userData && userData.resumeURL) {
				updateData.resumeURL = userData.resumeURL;
			}

			await updateDoc(doc(db, 'users', user.uid), updateData);
			showAlert('Profile updated successfully!', 'success');
			isProfileExpanded = false;
		} catch (error) {
			showAlert('Error updating profile. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function generateQRCode() {
		try {
			const qrData = {
				userId: userDocId,
				name: `${firstName} ${lastName}`,
				drink: '',
				dietaryConsiderations: dietaryConsiderations
			};

			qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
				width: 500,
				margin: 2,
				color: {
					dark: '#ff8236',
					light: '#FFFFFF'
				}
			});

			// Update the user document with the new QR code
			await updateDoc(doc(db, 'users', user.uid), { qrCodeDataUrl });
		} catch (err) {
			console.error('Error generating QR code:', err);
			showAlert('Error generating QR code. Please try again.', 'error');
		}
	}

	async function updateDashboardVisit() {
		try {
			const now = new Date();
			const updateData = {
				lastDashboardVisit: now
			};

			// Only set firstDashboardVisit if it doesn't already exist
			if (!userData.firstDashboardVisit) {
				updateData.firstDashboardVisit = now;
			}

			await updateDoc(doc(db, 'users', user.uid), updateData);

			// Update local userData to reflect the changes
			userData.lastDashboardVisit = now;
			if (!userData.firstDashboardVisit) {
				userData.firstDashboardVisit = now;
			}
		} catch (error) {
			console.error('Error updating dashboard visit:', error);
		}
	}

	async function fetchTeamsAndProjects() {
		try {
			// Fetch team details
			if (pastTeams.length > 0) {
				const teamPromises = pastTeams.map(async (teamId) => {
					const teamDoc = await getDoc(doc(db, 'teams', teamId));
					return teamDoc.exists() ? { id: teamDoc.id, ...teamDoc.data() } : null;
				});
				pastTeamsData = (await Promise.all(teamPromises)).filter((team) => team !== null);
			}

			// Fetch project details
			if (allProjects.length > 0) {
				const projectPromises = allProjects.map(async (projectId) => {
					const projectDoc = await getDoc(doc(db, 'projects', projectId));
					return projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } : null;
				});
				allProjectsData = (await Promise.all(projectPromises)).filter(
					(project) => project !== null
				);
			}
		} catch (error) {
			console.error('Error fetching teams and projects:', error);
		}
	}

	// Function to check if an event is in the past
	function isEventPast(eventDate, eventTime) {
		const now = new Date();
		// Parse date in local timezone
		const [year, month, day] = eventDate.split('-');
		const [hour, minute] = eventTime.split(':');
		const eventDateTime = new Date(year, month - 1, day, hour, minute);
		return eventDateTime < now;
	}

	// Function to format date for display
	function formatDate(dateString) {
		// Parse date in local timezone
		const [year, month, day] = dateString.split('-');
		const date = new Date(year, month - 1, day - 1); // FIX: difference was between datetime and string entry, remove -1 later
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	// Function to format time for display
	function formatTime(timeString) {
		const [hour, minute] = timeString.split(':');
		const date = new Date();
		date.setHours(parseInt(hour), parseInt(minute));
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	async function loadCalendarEvents() {
		try {
			const calendarEventsQuery = query(collection(db, 'calendar'), orderBy('date', 'asc'));
			const querySnapshot = await getDocs(calendarEventsQuery);

			calendarEvents = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : 'Unknown'
			}));

			// Filter for upcoming events (next 3 events that haven't passed)
			const now = new Date();
			upcomingEvents = calendarEvents
				.filter((event) => !isEventPast(event.date, event.time))
				.slice(0, 3);
		} catch (error) {
			console.error('Error loading calendar events:', error);
		}
	}

	async function updateRSVP() {
		try {
			const newRSVP = {
				drink,
				rsvp926,
				rsvp104,
				timestamp: new Date()
			};

			rsvps = [...rsvps, newRSVP];

			await generateQRCode();
			await updateProfile();

			showAlert('RSVP updated successfully!', 'success');
		} catch (error) {
			console.error('Error updating RSVP:', error);
			showAlert('Error updating RSVP. Please try again.', 'error');
		}
	}

	onMount(async () => {
		isLoading = true;
		auth.onAuthStateChanged(async (authUser) => {
			if (authUser) {
				user = authUser;
				await loadUserData();
				await loadTeamMembers();
				await loadDraft();
				currentUser = authUser;

				// if user is valid, step 1 is complete
				if (userData && userData.firstName && userData.andrewId) {
					changeStep(0);
				}

				// if user has submitted a draft, step 2 is complete
				if (draftId) {
					changeStep(1);
				}

				// if user team has signed the contract, step 3 is complete
				if (hasSignedContract) {
					changeStep(3);
				}
			}
			isLoading = false;
		});
		document.addEventListener('paste', handleImagePaste);
		return () => {
			document.removeEventListener('paste', handleImagePaste);
		};
	});

	$: if (draftId) {
		// console.log('Draft loaded, updating component');
	}

	function showAlert(message, type) {
		alertMessage = message;
		alertType = type;
		setTimeout(() => {
			alertMessage = '';
			alertType = '';
		}, 5000);
	}

	let isLoadingTeamMembers = false; // Prevent concurrent loads

	async function loadTeamMembers() {
		// Prevent concurrent loading
		if (isLoadingTeamMembers) {
			console.log('Team members already loading, skipping...');
			return;
		}

		if (userData && userData.teamId) {
			isLoadingTeamMembers = true;
			try {
				// Fetch team data
				const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
				if (teamDoc.exists()) {
					const teamData = teamDoc.data();
					teamName = teamData.name || 'Unnamed Team';
					hasTeamName = true;

					// Get team members from the team's members array
					const memberIds = teamData.members || [];
					// Remove duplicates from member IDs
					const uniqueMemberIds = [...new Set(memberIds)];

					// Ensure current user is in the team members list
					if (!uniqueMemberIds.includes(user.uid)) {
						console.warn('Current user not found in team members list, adding...');
						uniqueMemberIds.push(user.uid);
						// Update the team document to include the current user
						await updateDoc(doc(db, 'teams', userData.teamId), {
							members: uniqueMemberIds
						});
					}

					// Clear the current team members array to prevent accumulation
					const newTeamMembers = [];
					const loadedMemberIds = new Set(); // Track loaded members to prevent duplicates

					for (const memberId of uniqueMemberIds) {
						// Skip if we've already loaded this member
						if (loadedMemberIds.has(memberId)) {
							console.warn(`Skipping duplicate member ID: ${memberId}`);
							continue;
						}

						try {
							const memberDoc = await getDoc(doc(db, 'users', memberId));
							if (memberDoc.exists()) {
								const memberData = memberDoc.data();
								// Add uid to memberData for proper identification
								memberData.uid = memberId;
								// Add a flag to identify the current user
								memberData.isCurrentUser = memberId === user.uid;
								newTeamMembers.push(memberData);
								loadedMemberIds.add(memberId);
							} else {
								console.warn(`User document not found for member: ${memberId}`);
							}
						} catch (memberError) {
							console.warn(`Error loading member ${memberId}:`, memberError);
						}
					}

					// Sort team members to put current user first
					newTeamMembers.sort((a, b) => {
						if (a.isCurrentUser) return -1;
						if (b.isCurrentUser) return 1;
						return 0;
					});

					// Update teamMembers only after all data is loaded
					teamMembers = newTeamMembers;

					// Debug logging to help with future issues
					console.log(
						'Team members loaded:',
						teamMembers.map((m) => ({
							uid: m.uid,
							firstName: m.firstName,
							isCurrentUser: m.isCurrentUser
						}))
					);

					// check if any team members have the contracturl field
					const hasContract = teamMembers.some((member) => member.contractURL);
					if (hasContract) {
						hasSignedContract = true;
					}
				} else {
					teamName = 'Team Not Found';
					hasTeamName = false;
					teamMembers = [];
				}
			} catch (error) {
				console.error('Error loading team members:', error);
				showAlert('Error loading team members. Please try again.', 'error');
			} finally {
				isLoadingTeamMembers = false;
			}
		} else {
			// User is not in a team
			teamName = '';
			hasTeamName = false;
			teamMembers = [];
		}
	}

	async function loadDraft() {
		if (!userData || !userData.teamId) return;

		try {
			const draftQuery = query(
				collection(db, '2026-drafts'),
				where('teamId', '==', userData.teamId)
			);
			const querySnapshot = await getDocs(draftQuery);

			if (!querySnapshot.empty) {
				const draftDoc = querySnapshot.docs[0];
				draftId = draftDoc.id;
				const draftData = draftDoc.data();

				// Update the component's state with the loaded draft data
				title = draftData.title || '';
				year = draftData.year || '2026';
				detail = draftData.detail || '';
				featured = draftData.featured || false;
				awards = draftData.awards ? draftData.awards.join(', ') : '';
				extendedDetails = draftData.extendedDetails || '';
				teamProfiles = draftData.teamProfiles
					? [...draftData.teamProfiles]
					: [{ username: '', name: '' }];
				partsAndCosts = draftData.partsAndCosts ? [...draftData.partsAndCosts] : [];
				image = draftData.image || '';
				images = draftData.images ? [...draftData.images] : [];
				attachments = draftData.attachments ? [...draftData.attachments] : [];
				team = draftData.team || '';
				track = draftData.track || '';
				track1 = draftData.track1 || false;
				track2 = draftData.track2 || false;
			} else {
				console.log('No draft found for team:', userData.teamId);
			}
		} catch (error) {
			console.error('Error loading draft:', error);
			resetDraftFields();
		}
	}

	function resetDraftFields() {
		title = '';
		year = '2026';
		detail = '';
		featured = false;
		awards = '';
		extendedDetails = '';
		teamProfiles = [{ username: '', name: '' }];
		partsAndCosts = [];
		image = '';
		team = '';
		draftId = null;
	}

	async function saveProject() {
		if (!userData || !userData.teamId) {
			showAlert('You must be part of a team to save a project.', 'error');
			return;
		}

		isLoading = true;
		try {
			const projectData = {
				teamId: userData.teamId,
				title,
				year,
				detail,
				featured,
				awards: awards
					.split(',')
					.map((award) => award.trim())
					.filter(Boolean),
				extendedDetails,
				teamProfiles,
				partsAndCosts,
				image,
				images,
				attachments,
				track,
				track1,
				track2,
				innov18,
				uploadedImages,
				team: teamName || userData.teamName || '',
				lastUpdated: new Date()
			}; // Save to 2026-drafts collection (consistent with loadDraft function)
			if (draftId) {
				// Update existing draft
				await updateDoc(doc(db, '2026-drafts', draftId), projectData);
			} else {
				// Create new draft
				const docRef = await addDoc(collection(db, '2026-drafts'), projectData);
				draftId = docRef.id;
			}

			// update userData with track and innov18 status
			await updateDoc(doc(db, 'users', user.uid), { track1, track2, innov18 });

			showAlert('Project draft saved successfully!', 'success');
			isProjectExpanded = false;
		} catch (error) {
			console.error('Error saving project:', error);
			showAlert('Error saving project. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function updateTeamInfo() {
		isLoading = true;
		try {
			await updateDoc(doc(db, 'users', user.uid), {
				track,
				track1,
				track2,
				innov18,
				buildIntent,
				preliminaryParts
			});
			showAlert('Team info updated successfully!', 'success');
		} catch (error) {
			showAlert('Error updating team info. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}
	async function joinTeam() {
		isLoading = true;
		try {
			const teamQuery = query(collection(db, 'teams'), where('name', '==', joinTeamName));
			const teamSnapshot = await getDocs(teamQuery);

			if (!teamSnapshot.empty) {
				const teamDoc = teamSnapshot.docs[0];
				const teamData = teamDoc.data();

				if (teamData.password === joinTeamPassword) {
					// Add user to team's members array first
					const currentMembers = teamData.members || [];
					const uniqueMembers = [...new Set([...currentMembers, user.uid])];

					await updateDoc(doc(db, 'teams', teamDoc.id), {
						members: uniqueMembers
					});

					// Update user's teamId
					await updateDoc(doc(db, 'users', user.uid), { teamId: teamDoc.id });

					// Clear form fields
					joinTeamName = '';
					joinTeamPassword = '';

					showAlert('Joined team successfully!', 'success');
					await loadUserData();
					await loadTeamMembers();
				} else {
					showAlert('Invalid team password.', 'error');
				}
			} else {
				showAlert('Team not found.', 'error');
			}
		} catch (error) {
			console.error('Error joining team:', error);
			showAlert('Error joining team. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function leaveTeam() {
		isLoading = true;
		try {
			// Remove user from team's members array
			if (userData && userData.teamId) {
				const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
				if (teamDoc.exists()) {
					const teamData = teamDoc.data();
					const currentMembers = teamData.members || [];
					const updatedMembers = currentMembers.filter((id) => id !== user.uid);
					await updateDoc(doc(db, 'teams', userData.teamId), {
						members: updatedMembers
					});
				}
			}

			// Remove teamId from user
			await updateDoc(doc(db, 'users', user.uid), {
				teamId: null,
				track: '',
				track1: false,
				track2: false,
				innov18: false
			});
			showAlert('Left team successfully!', 'success');
			await loadUserData();
			await loadTeamMembers();
			displayTeamName = 'No Team';
		} catch (error) {
			showAlert('Error leaving team. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	// Migration function to fix existing teams that may have inconsistent member data
	async function migrateTeamMembersData() {
		// Add a confirmation dialog before running migration
		if (!confirm('This will migrate team member data. Are you sure you want to continue?')) {
			return;
		}

		try {
			console.log('Starting team members migration...');

			// Get all teams
			const teamsSnapshot = await getDocs(collection(db, 'teams'));

			for (const teamDocSnapshot of teamsSnapshot.docs) {
				const teamId = teamDocSnapshot.id;
				const teamData = teamDocSnapshot.data();

				// Find all users with this teamId
				const usersQuery = query(collection(db, 'users'), where('teamId', '==', teamId));
				const usersSnapshot = await getDocs(usersQuery);

				const actualMemberIds = usersSnapshot.docs.map((doc) => doc.id);
				const currentMembers = teamData.members || [];

				// Check if members array needs to be updated
				const needsUpdate =
					actualMemberIds.length !== currentMembers.length ||
					!actualMemberIds.every((id) => currentMembers.includes(id));

				if (needsUpdate) {
					console.log(
						`Updating team ${teamData.name} (${teamId}): ${currentMembers.length} -> ${actualMemberIds.length} members`
					);
					await updateDoc(doc(db, 'teams', teamId), {
						members: actualMemberIds
					});
				}
			}

			console.log('Team members migration completed!');
			showAlert('Team migration completed successfully!', 'success');
		} catch (error) {
			console.error('Migration error:', error);
			showAlert('Error during migration. Check console for details.', 'error');
		}
	}

	async function createTeam() {
		isLoading = true;
		try {
			if (newTeamName && newTeamPassword) {
				// Check if team name already exists
				const existingTeamQuery = query(collection(db, 'teams'), where('name', '==', newTeamName));
				const existingTeamSnapshot = await getDocs(existingTeamQuery);

				if (!existingTeamSnapshot.empty) {
					showAlert('Team name already exists. Please choose a different name.', 'error');
					return;
				}

				const teamRef = await addDoc(collection(db, 'teams'), {
					name: newTeamName,
					password: newTeamPassword,
					creatorId: user.uid,
					members: [user.uid],
					year: 2026,
					createdAt: new Date()
				});

				await updateDoc(doc(db, 'users', user.uid), { teamId: teamRef.id });

				// Clear form fields
				const createdTeamName = newTeamName;
				newTeamName = '';
				newTeamPassword = '';

				await loadUserData();
				await loadTeamMembers();

				showAlert(`Team "${createdTeamName}" created successfully!`, 'success');
			} else {
				showAlert('Please enter both team name and password.', 'error');
			}
		} catch (error) {
			console.error('Error creating team:', error);
			showAlert('Error creating team. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function handleImageUpload(event) {
		const files = event.target.files;
		if (!files.length) return;

		isLoading = true;
		const storage = getStorage();

		for (const file of files) {
			const storageRef = ref(storage, `projects/${draftId}/${file.name}`);
			await uploadBytes(storageRef, file);
			const downloadURL = await getDownloadURL(storageRef);
			uploadedImages.push(downloadURL);
		}

		images = [...images, ...uploadedImages];

		try {
			const draftRef = doc(db, '2026-drafts', draftId);
			await updateDoc(draftRef, { images });
			showAlert('Images uploaded successfully!', 'success');
		} catch (error) {
			console.error('Error updating draft with images:', error);
			showAlert('Error uploading images. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	async function handleAttachmentUpload(event) {
		const files = event.target.files;
		if (!files.length) return;

		isLoading = true;
		const storage = getStorage();
		const uploadedAttachments = [];

		try {
			for (const file of files) {
				const timestamp = new Date().getTime();
				const fileName = `${timestamp}_${file.name}`;
				const storageRef = ref(storage, `projects/${draftId}/attachments/${fileName}`);
				await uploadBytes(storageRef, file);
				const downloadURL = await getDownloadURL(storageRef);

				uploadedAttachments.push({
					name: file.name,
					url: downloadURL,
					uploadDate: new Date().toISOString()
				});
			}

			attachments = [...attachments, ...uploadedAttachments];

			const draftRef = doc(db, '2026-drafts', draftId);
			await updateDoc(draftRef, { attachments });
			showAlert('Attachments uploaded successfully!', 'success');
		} catch (error) {
			console.error('Error updating draft with attachments:', error);
			showAlert('Error uploading attachments. Please try again.', 'error');
		} finally {
			isLoading = false;
		}
	}

	function handleBulkPaste(event) {
		const newParts = event.detail;
		partsAndCosts = [...partsAndCosts, ...newParts];
	}

	function handleImagePaste(event) {
		const items = (event.clipboardData || event.originalEvent.clipboardData).items;
		for (let item of items) {
			if (item.type.indexOf('image') === 0) {
				const blob = item.getAsFile();
				const reader = new FileReader();
				reader.onload = (e) => {
					image = e.target.result;
				};
				reader.readAsDataURL(blob);
			}
		}
	}

	function addPartAndCost() {
		partsAndCosts = [
			...partsAndCosts,
			{ part: '', cost: 0, quantity: 1, link: '', reimbursement: false }
		];
	}

	function removePartAndCost(index) {
		partsAndCosts = partsAndCosts.filter((_, i) => i !== index);
	}

	async function logout() {
		try {
			await auth.signOut();
		} catch (error) {
			showAlert('Error logging out. Please try again.', 'error');
		}
		// Clear user data
		localStorage.removeItem('userToken');

		// Redirect to login page
		navigate('/');
	}

	async function uploadContract(downloadURL) {
		console.log('Uploading contract');

		try {
			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, {
				contractURL: downloadURL // Use the downloadURL from the previous uploadFile function
			});
			console.log('Contract URL added to user document');
		} catch (error) {
			console.error('Error updating user document:', error);
			showAlert('Error adding contract to user profile', 'error');
		}
	}

	async function uploadResume(event) {
		const file = event.target.files[0];
		if (!file) return;

		isLoading = true;
		const storage = getStorage();
		const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
		await uploadBytes(storageRef, file);
		const downloadURL = await getDownloadURL(storageRef);

		try {
			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, {
				resumeURL: downloadURL
			});
			console.log('Resume URL added to user document');

			// Update local userData to reflect the change immediately
			userData = { ...userData, resumeURL: downloadURL };
		} catch (error) {
			console.error('Error updating user document:', error);
			showAlert('Error adding resume to user profile', 'error');
			isLoading = false;
			return;
		}
		showAlert('Resume uploaded successfully!', 'success');
		console.log('File available at', downloadURL);

		isLoading = false;
	}

	// Function to find and use the most recently uploaded contract
	async function findLatestContract() {
		try {
			const storage = getStorage();
			const contractsRef = ref(storage, `contracts/${user.uid}/`);
			const result = await listAll(contractsRef);

			if (result.items.length === 0) {
				console.log('No contracts found for user');
				return null;
			}

			// Get metadata for all files to find the most recent one
			const filePromises = result.items.map(async (itemRef) => {
				const metadata = await getMetadata(itemRef);
				const downloadURL = await getDownloadURL(itemRef);
				return {
					ref: itemRef,
					downloadURL,
					timeCreated: new Date(metadata.timeCreated),
					name: itemRef.name
				};
			});

			const files = await Promise.all(filePromises);

			// Sort by creation time, most recent first
			files.sort((a, b) => b.timeCreated - a.timeCreated);

			const latestFile = files[0];
			console.log(
				'Found latest contract:',
				latestFile.name,
				'uploaded at:',
				latestFile.timeCreated
			);

			return latestFile.downloadURL;
		} catch (error) {
			console.error('Error finding latest contract:', error);
			return null;
		}
	}

	// Function to find and use the most recently uploaded resume
	async function findLatestResume() {
		try {
			const storage = getStorage();
			const resumesRef = ref(storage, `resumes/${user.uid}/`);
			const result = await listAll(resumesRef);

			if (result.items.length === 0) {
				console.log('No resumes found for user');
				return null;
			}

			// Get metadata for all files to find the most recent one
			const filePromises = result.items.map(async (itemRef) => {
				const metadata = await getMetadata(itemRef);
				const downloadURL = await getDownloadURL(itemRef);
				return {
					ref: itemRef,
					downloadURL,
					timeCreated: new Date(metadata.timeCreated),
					name: itemRef.name
				};
			});

			const files = await Promise.all(filePromises);

			// Sort by creation time, most recent first
			files.sort((a, b) => b.timeCreated - a.timeCreated);

			const latestFile = files[0];
			console.log('Found latest resume:', latestFile.name, 'uploaded at:', latestFile.timeCreated);

			return latestFile.downloadURL;
		} catch (error) {
			console.error('Error finding latest resume:', error);
			return null;
		}
	}

	// Function to update user's contract URL to the latest uploaded file
	async function useLatestContract() {
		isLoading = true;
		try {
			const latestContractURL = await findLatestContract();

			if (!latestContractURL) {
				showAlert('No contracts found to update', 'info');
				return;
			}

			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, {
				contractURL: latestContractURL
			});

			// Update local userData to reflect the change immediately
			userData = { ...userData, contractURL: latestContractURL };

			showAlert('Contract updated to latest uploaded file!', 'success');
			console.log('Updated to latest contract URL:', latestContractURL);
		} catch (error) {
			console.error('Error updating to latest contract:', error);
			showAlert('Error updating to latest contract', 'error');
		} finally {
			isLoading = false;
		}
	}

	// Function to update user's resume URL to the latest uploaded file
	async function useLatestResume() {
		isLoading = true;
		try {
			const latestResumeURL = await findLatestResume();

			if (!latestResumeURL) {
				showAlert('No resumes found to update', 'info');
				return;
			}

			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, {
				resumeURL: latestResumeURL
			});

			// Update local userData to reflect the change immediately
			userData = { ...userData, resumeURL: latestResumeURL };

			showAlert('Resume updated to latest uploaded file!', 'success');
			console.log('Updated to latest resume URL:', latestResumeURL);
		} catch (error) {
			console.error('Error updating to latest resume:', error);
			showAlert('Error updating to latest resume', 'error');
		} finally {
			isLoading = false;
		}
	}

	// Function to automatically check and suggest using newer uploads (called on dashboard load)
	async function checkForNewerUploads() {
		try {
			let suggestedUpdates = [];

			// Check contracts
			if (userData && userData.contractURL) {
				const latestContractURL = await findLatestContract();
				if (latestContractURL && latestContractURL !== userData.contractURL) {
					suggestedUpdates.push('contract');
				}
			}

			// Check resumes
			if (userData && userData.resumeURL) {
				const latestResumeURL = await findLatestResume();
				if (latestResumeURL && latestResumeURL !== userData.resumeURL) {
					suggestedUpdates.push('resume');
				}
			}

			// Show alert if newer files are available
			if (suggestedUpdates.length > 0) {
				const fileTypes = suggestedUpdates.join(' and ');
				showAlert(
					`Newer ${fileTypes} upload(s) available! Use the "USE LATEST" buttons to update.`,
					'info'
				);
				console.log('Newer uploads detected for:', suggestedUpdates);
			}
		} catch (error) {
			console.warn('Error checking for newer uploads:', error);
		}
	}

	async function uploadContractFile(event) {
		const file = event.target.files[0];
		if (!file) return;

		isLoading = true;
		const storage = getStorage();
		const storageRef = ref(storage, `contracts/${user.uid}/${file.name}`);
		await uploadBytes(storageRef, file);
		const downloadURL = await getDownloadURL(storageRef);

		try {
			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, {
				contractURL: downloadURL
			});
			console.log('Contract URL added to user document');
			console.log('New contract URL:', downloadURL);

			// Update local userData to reflect the change immediately
			userData = { ...userData, contractURL: downloadURL };
			console.log('Local userData updated with contract URL');
		} catch (error) {
			console.error('Error updating user document:', error);
			showAlert('Error adding contract to user profile', 'error');
			isLoading = false;
			return;
		}
		showAlert('Contract uploaded successfully!', 'success');
		console.log('File available at', downloadURL);

		isLoading = false;
	}

	async function uploadFile(event) {
		const file = event.target.files[0];
		if (!file) return;

		isLoading = true;
		const storage = getStorage();
		const storageRef = ref(storage, `contracts/${user.uid}/${file.name}`);
		await uploadBytes(storageRef, file);
		const downloadURL = await getDownloadURL(storageRef);
		showAlert('File uploaded successfully!', 'success');
		hasSignedContract = true;

		console.log('File available at', downloadURL);

		await uploadContract(downloadURL);

		isLoading = false;

		// update the step
		changeStep(3);

		// refresh the page
		location.reload();
	}

	let steps = [
		{ text: 'Register' },
		{ text: 'Join Team' },
		{ text: 'Sign Contract' },
		{ text: 'Submit Draft' }
	];

	let current = 0;

	// Calculate current step based on user progress
	$: {
		if (!userData) {
			current = 0; // Not registered yet
		} else if (!userData.firstName || !userData.andrewId) {
			current = 0; // Registration incomplete
		} else if (!userData.teamId) {
			current = 1; // Registered but no team
		} else {
			// Check if any team member has signed a contract
			const hasContract = teamMembers.some((member) => member.contractURL);
			if (!hasContract) {
				current = 2; // Has team but no contract
			} else if (!draftId) {
				current = 3; // Has contract but no draft
			} else {
				current = 4; // All steps completed
			}
		}
	}

	function changeStep(step) {
		current = step;
	}

	function deleteUser() {
		// Delete user account
		const user = auth.currentUser;
		user.delete().then(() => {
			// User deleted.
			console.log('User deleted');
		});

		// redirect to login page
		window.location.href = '/';
	}
</script>

{#if currentUser}
	<div class="bg-white bg-custom">
		<div class="relative z-100">
			<div class="container mx-auto px-4 py-8 mt-8 max-w-5xl">
				{#if isLoading}
					<div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
						<div
							class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"
						></div>
					</div>
				{/if}

				<h2 class="text-4xl font-extrabold mb-8 text-center text-orange-500 pt-20 pb-12">
					{#if userData && userData.teamId}
						Welcome back to Build18, {userData?.firstName || 'Guest'}!
					{:else}
						Welcome to Build18!
					{/if}
				</h2>

				<!-- Progress Steps -->
				<div class="mb-8">
					<Steps {steps} clickable={false} primary="#ff8236" bind:current />
				</div>

				<!-- Orange banner with upcoming events -->
				<div class="bg-white text-orange-500 p-6 rounded-lg mb-8">
					<div class="text-center mb-4"></div>

					{#if upcomingEvents.length > 0}
						<div class="border-t border-orange-400 text-white pt-4">
							<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
								{#each upcomingEvents as event}
									<div class="bg-orange-500 rounded-lg p-3 backdrop-blur-sm">
										<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
											<div class="flex-1">
												<h5 class="font-medium text-sm mb-1 line-clamp-1">{event.title}</h5>
												<div class="flex items-center text-xs opacity-90 mb-1">
													<svg
														class="w-3 h-3 mr-1"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
														></path>
													</svg>
													<span>{formatDate(event.date)}</span>
												</div>
												<div class="flex items-center text-xs opacity-90">
													<svg
														class="w-3 h-3 mr-1"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														></path>
													</svg>
													<span>{formatTime(event.time)}</span>
												</div>
											</div>
											{#if event.location}
												<div class="mt-2 sm:mt-0 sm:ml-2">
													<div class="flex items-center text-xs opacity-90">
														<svg
															class="w-3 h-3 mr-1"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
															></path>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
															></path>
														</svg>
														<span class="truncate">{event.location}</span>
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
							<div class="text-center mt-3">
								<a
									href="/calendar"
									class="text-sm text-orange-600 hover:text-white underline transition-colors duration-200"
								>
									View all events →
								</a>
							</div>
						</div>
					{:else}
						<div class="border-t border-orange-400 pt-4 text-center">
							<p class="text-sm opacity-90">No upcoming events scheduled</p>
							<a
								href="/calendar"
								class="text-sm text-orange-100 hover:text-white underline transition-colors duration-200"
							>
								View calendar →
							</a>
						</div>
					{/if}
				</div>

				<!-- <button on:click={changeStep} >Next Step</button> -->
				{#if alertMessage}
					<Alert message={alertMessage} type={alertType} class="mt-12" />
				{/if}

				<!-- Profile Section -->
				<div class="bg-white shadow-lg rounded-lg p-6 mt-12 mb-8" transition:fade>
					<div class="flex flex-col sm:flex-row justify-between items-center">
						<h3 class="text-2xl font-extrabold text-orange-500 mb-4 sm:mb-0">PROFILE</h3>
						<button
							on:click={() => (isProfileExpanded = !isProfileExpanded)}
							class="text-orange-500 hover:text-orange-700 focus:outline-none px-4 py-2 rounded-md border border-orange-500 transition-colors duration-200"
						>
							{isProfileExpanded ? '˄' : '˅'}
						</button>
					</div>
					{#if isProfileExpanded}
						<form on:submit|preventDefault={updateProfile} class="space-y- mt-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label for="firstName" class="block text-sm font-medium text-gray-700 mb-2"
										>First Name</label
									>
									<input
										type="text"
										id="firstName"
										bind:value={firstName}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
									/>
								</div>
								<div>
									<label for="lastName" class="block text-sm font-medium text-gray-700 mb-2"
										>Last Name</label
									>
									<input
										type="text"
										id="lastName"
										bind:value={lastName}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
									/>
								</div>
							</div>
							<div>
								<label for="andrewId" class="block text-sm font-medium text-gray-700 mt-4"
									>Andrew ID</label
								>
								<input
									type="text"
									id="andrewId"
									bind:value={andrewId}
									class="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
								<br />
								<label for="shortLink" class="block text-sm font-medium text-gray-700 mt-4"
									>Requested Builder ID</label
								>
								<input
									type="text"
									id="shortLink"
									bind:value={shortLink}
									placeholder={andrewId}
									class="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
								<br />
								<label for="linkedin" class="block text-sm font-medium text-gray-700 mt-4"
									>LinkedIn Profile</label
								>
								<input
									type="text"
									id="linkedin"
									bind:value={linkedin}
									placeholder="https://www.linkedin.com/in/[profile]"
									class="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
								<br />
								<label for="github" class="block text-sm font-medium text-gray-700 mt-4"
									>GitHub Profile</label
								>
								<input
									type="text"
									id="github"
									bind:value={github}
									placeholder="https://github.com/[username]"
									class="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
								<br />
								<label for="personalWebsite" class="block text-sm font-medium text-gray-700 mt-4"
									>Personal Website URL</label
								>
								<input
									type="text"
									id="personalWebsite"
									bind:value={personalWebsite}
									class="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
								<br />
								<label for="bio" class="block text-sm font-medium text-gray-700 mt-4">Bio</label>
								<textarea
									id="bio"
									bind:value={bio}
									class="mt-1 block px-4 py-2 border w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								></textarea>
								<br />

								<!-- if not verified
								{#if !user.emailVerified}
									<button
										on:click={verifyEmail}
										class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
									>
										Verify Email
									</button>
								{/if} -->
							</div>

							<div class="grid grid-cols-2 gap-6 mt-2">
								<div>
									<label for="classYear" class="block text-sm font-medium text-gray-700 mt-2"
										>Class Year</label
									>
									<select
										id="classYear"
										bind:value={classYear}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select Class Year</option>
										<option value="First Year">First Year</option>
										<option value="Sophomore">Sophomore</option>
										<option value="Junior">Junior</option>
										<option value="Senior">Senior</option>
										<option value="Masters">Masters</option>
										<option value="Doctorate">Doctorate</option>
										<option value="Faculty">Faculty</option>
									</select>
								</div>
								<div>
									<label for="school" class="block text-sm font-medium text-gray-700">School</label>
									<select
										id="school"
										bind:value={school}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select School</option>
										<option value="Dietrich">Dietrich</option>
										<option value="College of Engineering">College of Engineering</option>
										<option value="School of Computer Science">School of Computer Science</option>
										<option value="College of Fine Arts">College of Fine Arts</option>
										<option value="Heinz College">Heinz College</option>
										<option value="Mellon College of Science">Mellon College of Science</option>
										<option value="Tepper School of Business">Tepper School of Business</option>
									</select>
								</div>
							</div>
							<div>
								<label for="majorProgram" class="block pt-4 text-sm font-medium text-gray-700"
									>Major / Program</label
								>
								<input
									type="text"
									id="majorProgram"
									bind:value={majorProgram}
									class="mt-1 block px-2 w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
								/>
							</div>
							<div class="grid grid-cols-2 gap-4 mt-4">
								<div>
									<label for="shirtSize" class="block text-sm font-medium text-gray-700"
										>Shirt Size</label
									>
									<select
										id="shirtSize"
										bind:value={shirtSize}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select Shirt Size</option>
										<option value="XS">XS</option>
										<option value="S">S</option>
										<option value="M">M</option>
										<option value="L">L</option>
										<option value="XL">XL</option>
									</select>
								</div>
								<div>
									<label for="dietaryConsiderations" class="block text-sm font-medium text-gray-700"
										>Dietary Considerations</label
									>
									<select
										id="dietaryConsiderations"
										bind:value={dietaryConsiderations}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select Dietary Considerations</option>
										<option value="None">None</option>
										<option value="Vegetarian">Vegetarian</option>
										<option value="Vegan">Vegan</option>
										<option value="Celiac">Celiac</option>
										<option value="Kosher">Kosher</option>
										<option value="Halal">Halal</option>
										<option value="Other">Other</option>
									</select>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4 pt-4">
								<div>
									<label for="gender" class="block text-sm font-medium text-gray-700">Gender</label>
									<select
										id="gender"
										bind:value={gender}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select Gender</option>
										<option value="Man">Man</option>
										<option value="Woman">Woman</option>
										<option value="Non-Binary">Non-Binary</option>
										<option value="Prefer to self-describe">Prefer to self-describe</option>
										<option value="Prefer not to answer">Prefer not to answer</option>
									</select>
									<!-- if self describe, input -->
									{#if gender === 'Prefer to self-describe'}
										<input
											type="text"
											bind:value={gender}
											placeholder="Please describe.."
											class="mt-1 block w-full text-gray-300 rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
										/>
									{/if}
								</div>
								<div class="mb-4">
									<label for="ethnicity" class="block text-sm font-medium text-gray-700"
										>Ethnicity</label
									>
									<select
										id="ethnicity"
										bind:value={ethnicity}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<option value="">Select Ethnicity</option>
										<option value="Asian Indian">Asian Indian</option>
										<option value="Black or African">Black or African</option>
										<option value="Chinese">Chinese</option>
										<option value="Filipino">Filipino</option>
										<option value="Hispanic / Latino / Spanish Origin"
											>Hispanic / Latino / Spanish Origin</option
										>
										<option value="Japanese">Japanese</option>
										<option value="Korean">Korean</option>
										<option value="Middle Eastern">Middle Eastern</option>
										<option value="Native American or Alaskan Native"
											>Native American or Alaskan Native</option
										>
										<option value="Vietnamese">Vietnamese</option>
										<option value="White">White</option>
										<option value="Other Asian (Thai, Cambodian, etc)"
											>Other Asian (Thai, Cambodian, etc)</option
										>
										<option value="Other Pacific Islander">Other Pacific Islander</option>
										<option value="Other (Please Specify)">Other (Please Specify)</option>
										<option value="Prefer Not to Answer">Prefer Not to Answer</option>
									</select>
									<!-- if self describe, input -->
									{#if ethnicity === 'Other (Please Specify)'}
										<input
											type="text"
											bind:value={ethnicity}
											placeholder="Please specify.."
											class="mt-1 block w-full text-gray-300 rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
										/>
									{/if}
								</div>
							</div>

							<!-- Checkboxes for internships, fulltime search -->
							<div class="grid grid-cols-2 gap-4 pt-4">
								<div>
									<label for="startDates" class="block text-sm font-medium text-gray-700"
										>Looking for...</label
									>
									<div class="flex items-center mt-2">
										<input
											type="checkbox"
											id="searchingInternship"
											bind:checked={searchingInternship}
											class="mr-2 rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
										/>
										<label for="searchingInternship" class="">Searching for Internship</label>
									</div>
									<div class="flex items-center">
										<input
											type="checkbox"
											id="searchingFulltime"
											bind:checked={searchingFulltime}
											class="mr-2 rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
										/>
										<label for="searchingFulltime" class="">Searching for Full-time</label>
									</div>
								</div>

								<!-- Push to available start dates - Winter 2025, Spring 2026, Summer 2026, Fall 2026 -->
								<div>
									<label for="startDates" class="block text-sm font-medium text-gray-700"
										>Available Start Dates</label
									>
									<div
										class="mt-1 block w-full rounded-md focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
									>
										<label class="block">
											<input type="checkbox" value="Winter 2025" bind:group={startDates} />
											Winter 2025
										</label>
										<label class="block">
											<input type="checkbox" value="Spring 2026" bind:group={startDates} />
											Spring 2026
										</label>
										<label class="block">
											<input type="checkbox" value="Summer 2026" bind:group={startDates} />
											Summer 2026
										</label>
										<label class="block">
											<input type="checkbox" value="Fall 2026" bind:group={startDates} />
											Fall 2026
										</label>
									</div>
								</div>
							</div>
							<!-- upload resume button -->
							<div class="flex items-center mx-auto my-4 mt-4">
								<input
									type="file"
									id="resume"
									accept=".pdf,.doc,.docx"
									on:change={uploadResume}
									class="hidden"
								/>
								<label
									for="resume"
									class="block w-full mx-auto text-orange-500 bg-white hover:bg-orange-200 border-2 border-orange-500 rounded-lg p-4 text-center cursor-pointer font-semibold"
								>
									UPLOAD RESUME
								</label>
								{#if userData && userData.resumeURL}
									<a
										href={userData.resumeURL}
										target="_blank"
										class="text-orange-500 hover:text-orange-700 border-1 border-orange-500 rounded-lg p-4 text-center cursor-pointer font-semibold ml-4"
									>
										View Resume
									</a>
								{/if}
							</div>
							<!-- use latest resume button -->
							<!-- <div class="flex items-center mx-auto my-2">
								<button
									on:click={useLatestResume}
									disabled={isLoading}
									class="block w-full mx-auto text-green-600 bg-white hover:bg-green-50 border-2 border-green-600 rounded-lg p-3 text-center cursor-pointer font-semibold text-sm"
								>
									{isLoading ? 'Checking...' : 'USE LATEST UPLOADED RESUME'}
								</button>
							</div> -->
							<!-- upload contract button -->
							<div class="flex items-center mx-auto my-4 mt-4">
								<input
									type="file"
									id="contract"
									accept=".pdf"
									on:change={uploadContractFile}
									class="hidden"
								/>
								<label
									for="contract"
									class="block w-full mx-auto text-white bg-blue-500 hover:bg-blue-600 border-2 rounded-lg p-4 text-center cursor-pointer font-semibold"
								>
									UPDATE CONTRACT
								</label>
								{#if userData && userData.contractURL}
									<a
										href={userData.contractURL}
										target="_blank"
										class="text-blue-500 hover:text-blue-700 border-1 border-blue-500 rounded-lg p-4 text-center cursor-pointer font-semibold ml-4"
									>
										View Contract
									</a>
								{/if}
								<a
									href="/contract-2026.pdf"
									download="contract-2026.pdf"
									class="text-blue-500 hover:text-blue-700 border-1 border-blue-500 rounded-lg p-4 text-center cursor-pointer font-semibold ml-4"
								>
									Download Contract Template
								</a>
							</div>
							<!-- use latest contract button -->
							<!-- <div class="flex items-center mx-auto my-2">
								<button
									on:click={useLatestContract}
									disabled={isLoading}
									class="block w-full mx-auto text-green-600 bg-white hover:bg-green-50 border-2 border-green-600 rounded-lg p-3 text-center cursor-pointer font-semibold text-sm"
								>
									{isLoading ? 'Checking...' : 'USE LATEST UPLOADED CONTRACT'}
								</button>
							</div> -->
							<button
								type="submit"
								class="w-full my-2 p-4 rounded-md shadow-sm font-semibold bg-orange-500 text-white border-2 border-orange-500 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
							>
								UPDATE PROFILE INFO
							</button>
						</form>
					{/if}
				</div>

				<!-- Team Information Section -->
				<div class="bg-white shadow-lg rounded-lg p-6 mb-8" transition:fade>
					<div class="flex flex-col sm:flex-row justify-between items-center">
						<h3 class="text-2xl font-extrabold text-orange-500 mb-4 sm:mb-0">TEAM | {teamName}</h3>
						<button
							on:click={() => (isTeamExpanded = !isTeamExpanded)}
							class="text-orange-500 hover:text-orange-700 focus:outline-none px-4 py-2 rounded-md border border-orange-500 transition-colors duration-200"
						>
							{isTeamExpanded ? '˄' : '˅'}
						</button>
					</div>
					{#if isTeamExpanded}
						<div>
							{#if userData && userData.teamId}
								<div class="mb-6 mt-4">
									<p class="font-medium mb-2">
										Your Team ID: <span class="text-orange-600">{userData.teamId}</span>
									</p>
									<p class="font-medium mb-2">
										Your Team Name: <span class="text-orange-600">{teamName}</span>
									</p>
								</div>
								<div class="mb-6">
									<!-- If there is project data, display that -->
									{#if draftId}
										<p class="font-medium mb-2">
											Your Project ID: <span class="text-orange-600">{draftId}</span>
										</p>
										<p class="font-medium mb-2">
											Your Project Title: <span class="text-orange-600">{title}</span>
										</p>
									{:else}
										<p class="text-gray-600 mb-2">No project data found for your team.</p>
									{/if}
								</div>
								<!-- Update team button -->
								<div class="flex flex-col items-center space-y-4 w-full mb-8">
									{#if hasSignedContract}
										<div class="w-full"></div>
									{:else}
									<p class="mb-6 text-gray-600">
										To fill out your team contract, visit the Profile section above. 
										Download the contract, complete it with your team's signatures, and upload to the Profile section.
									</p>
										<div class="w-full">
											<button
												class="block w-full text-red-500 bg-white hover:bg-red-100 border-2 border-red-500 rounded-lg p-4 text-center cursor-pointer font-semibold"
											>
												<div class="w-full">NO CONTRACT :(</div>
											</button>
										</div>
									{/if}
								</div>
								<!-- Team members list -->
								<div class="flex justify-between items-center mb-4">
									<h4 class="text-xl font-semibold">Team Members:</h4>
									<button
										on:click={refreshTeamData}
										class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
										disabled={isLoading}
									>
										{isLoading ? 'Refreshing...' : 'Refresh'}
									</button>
								</div>
								{#if teamMembers.length > 0}
									<ul class="space-y-2 mb-6">
										{#each teamMembers as member (member.uid || `fallback-${member.firstName || 'unknown'}-${member.lastName || 'user'}`)}
											<li
												class="p-3 rounded {member.isCurrentUser
													? 'bg-white border-2 border-orange-300'
													: 'bg-gray-100'}"
												transition:slide
											>
												<div class="flex items-center justify-between">
													<div class="flex items-center">
														<span>
															{member.firstName || 'Unknown'}
															{member.lastName || 'User'}
														</span>
														{#if member.isCurrentUser}
															<span class="text-orange-600 font-semibold ml-2">(You)</span>
														{/if}
													</div>
													<div class="flex items-center">
														{#if member.contractURL}
															<span
																class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2"
															>
																Contract Upload!
															</span>
														{/if}
													</div>
												</div>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-gray-600 mb-6">No team members found.</p>
								{/if}

								<button
									on:click={leaveTeam}
									class="w-full p-4 rounded-md shadow-sm font-semibold text-red-600 bg-white border-red-600 border-2 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
								>
									LEAVE TEAM
								</button>
							{:else}
								<p class="mb-6 text-gray-600">
									You are not part of a team yet. Please reach out to us at <a
										href="mailto:build18@ece.cmu.edu"
										class="text-orange-600">build18@ece.cmu.edu</a
									> for assistance.
								</p>
								<div class="space-y-6">
									<div>
										<h4 class="text-xl font-semibold mb-4">Join a Team:</h4>
										<form on:submit|preventDefault={joinTeam} class="space-y-4">
											<div>
												<label
													for="joinTeamName"
													class="block text-sm font-medium text-gray-700 mb-2">Team Name</label
												>
												<input
													type="text"
													id="joinTeamName"
													bind:value={joinTeamName}
													placeholder="Enter team name"
													class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
												/>
											</div>
											<div>
												<label
													for="joinTeamPassword"
													class="block text-sm font-medium text-gray-700 mb-2">Team Password</label
												>
												<input
													type="password"
													id="joinTeamPassword"
													bind:value={joinTeamPassword}
													placeholder="Enter team password"
													required
													class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
												/>
											</div>
											<button
												type="submit"
												class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
											>
												Join Team
											</button>
										</form>
									</div>
									<div>
										<h4 class="text-xl font-semibold mb-4">Or Create a New Team:</h4>
										<form on:submit|preventDefault={createTeam} class="space-y-4">
											<div>
												<label
													for="newTeamName"
													class="block text-sm font-medium text-gray-700 mb-2">New Team Name</label
												>
												<input
													type="text"
													id="newTeamName"
													bind:value={newTeamName}
													placeholder="Enter new team name"
													required
													class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
												/>
											</div>
											<div>
												<label
													for="newTeamPassword"
													class="block text-sm font-medium text-gray-700 mb-2"
													>New Team Password</label
												>
												<input
													type="password"
													id="newTeamPassword"
													bind:value={newTeamPassword}
													placeholder="Enter new team password"
													required
													class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50 px-4 py-2"
												/>
											</div>
											<button
												type="submit"
												class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
											>
												Create Team
											</button>
										</form>
									</div>
								<p class="mb-6 text-gray-600">
									To fill out your team contract, visit the Profile dropdown above. 
									Download the contract, complete it with your team's signatures, and upload.
								</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Project Draft Section -->
				{#if userData && userData.teamId}
					<div class="bg-white shadow-lg rounded-lg p-6 mb-8" transition:fade>
						<div class="flex flex-col sm:flex-row justify-between items-center">
							<h3 class="text-2xl font-extrabold text-orange-500 mb-4 sm:mb-0 uppercase">
								PROJECT | Track {track}

								{#if innov18}
									<span class="uppercase">| Innov18</span>
								{/if}
							</h3>
							<button
								on:click={() => (isProjectExpanded = !isProjectExpanded)}
								class="text-orange-500 hover:text-orange-700 focus:outline-none px-4 py-2 rounded-md border border-orange-500 transition-colors duration-200"
							>
								{isProjectExpanded ? '˄' : '˅'}
							</button>
						</div>
						{#if isProjectExpanded}
							<section class="max-w-4xl px-16 mx-auto p-6 bg-white rounded-lg mt-4">
								<form on:submit|preventDefault={saveProject} class="space-y-8">
									<div class="space-y-2">
										<label for="title" class="text-2xl font-semibold text-gray-700 block"
											>Title</label
										>
										<input
											type="text"
											id="title"
											bind:value={title}
											class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300"
										/>
									</div>

									<div class="space-y-2">
										<label for="detail" class="text-2xl font-semibold text-gray-700 block"
											>Description</label
										>
										<textarea
											id="detail"
											bind:value={detail}
											rows="3"
											class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300"
										></textarea>
									</div>

									<div class="space-y-2">
										<label for="extendedDetails" class="text-2xl font-semibold text-gray-700 block"
											>Extended Details</label
										>
										<textarea
											id="extendedDetails"
											bind:value={extendedDetails}
											rows="5"
											class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300"
										></textarea>
									</div>

									<div class="space-y-6">
										<!-- svelte-ignore a11y_label_has_associated_control -->
										<label
											id="parts-costs-label"
											class="text-2xl font-semibold text-gray-700 block"
										>
											Parts and Costs
										</label>
										<label for="extendedDetails" class="text-1xl text-gray-700 block">
											<p class="font-semibold">Approved Vendors:</p>
											<ul class="text-1xl text-gray-700 block">
												<li>Adafruit</li>
												<li>Sparkfun</li>
												<li>Mouser</li>
												<li>Pololu</li>
												<li>Digikey</li>
												<li>McMaster-Carr</li>
												<li>Amazon</li>
												<li>Reimbursements and TechSpark Direct Charges*</li>
											</ul>
										</label>
										<label for="extendedDetails" class="text-1xl text-gray-700 block">
											<p class="font-semibold">Banned Vendors:</p>
											<ul class="text-1xl text-gray-700 block">
												<li>Temu</li>
												<li>Alibaba</li>
												<li>Aliexpress</li>
												<li>Any International vendors that may cause shipping delays</li>
											</ul>
										</label>

										{#if partsAndCosts.length === 0}
											<div
												class="text-center py-8 border-2 border-dashed border-orange-300 rounded-lg bg-white"
											>
												<div class="">
													<p class="text-orange-600">No parts added yet!</p>
												</div>
											</div>
										{:else}
											<div
												role="group"
												aria-labelledby="parts-costs-label"
												class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 pt-4"
											>
												{#each partsAndCosts as item, index}
													<div
														class="bg-white p-6 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg"
														in:fly={{ y: 20, duration: 300 }}
														out:fade={{ duration: 200 }}
													>
														<div class="space-y-4">
															<input
																type="text"
																bind:value={item.part}
																placeholder="Part Name"
																aria-label={`Part ${index + 1} name`}
																class="w-full p-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8236] focus:border-transparent"
															/>
															<div class="flex space-x-4">
																<div class="w-1/2 space-y-1">
																	<label
																		for={`cost-${index}`}
																		class="block text-sm font-medium text-gray-700">Cost ($)</label
																	>
																	<input
																		id={`cost-${index}`}
																		type="number"
																		bind:value={item.cost}
																		placeholder="0.00"
																		step="0.01"
																		aria-label={`Part ${index + 1} cost`}
																		class="w-full p-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8236] focus:border-transparent"
																	/>
																</div>
																<div class="w-1/2 space-y-1">
																	<label
																		for={`quantity-${index}`}
																		class="block text-sm font-medium text-gray-700">Quantity</label
																	>
																	<input
																		id={`quantity-${index}`}
																		type="number"
																		bind:value={item.quantity}
																		placeholder="1"
																		step="1"
																		aria-label={`Part ${index + 1} quantity`}
																		class="w-full p-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8236] focus:border-transparent"
																	/>
																</div>
															</div>
															<input
																type="url"
																bind:value={item.link}
																placeholder="Link to Part"
																aria-label={`Part ${index + 1} link`}
																class="w-full p-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8236] focus:border-transparent"
															/>
															<div class="flex flex-col space-y-4">
																<p class="text-lg text-orange-500 font-bold">Who will purchase?</p>
																<div class="flex items-center space-x-8">
																	<!-- Option: Build18 will buy -->
																	<label class="flex items-center space-x-2 cursor-pointer">
																		<input
																			type="radio"
																			name={`buyer-${index}`}
																			value="Build18 will buy"
																			class="form-radio h-5 w-5 text-[#ff8236] focus:ring-2 focus:ring-[#ff8236] accent-orange-300"
																			on:change={() => (item.reimbursement = false)}
																			checked={!item.reimbursement}
																		/>
																		<span class=" text-sm text-gray-700"
																			>Build18 will buy (January pickup)</span
																		>
																	</label>

																	<!-- Option: Our team will buy -->
																	<label class="flex items-center space-x-2 cursor-pointer">
																		<input
																			type="radio"
																			name={`buyer-${index}`}
																			value="Our team will buy"
																			class="form-radio h-5 w-5 text-[#ff8236] focus:ring-2 focus:ring-[#ff8236] accent-orange-300"
																			on:change={() => (item.reimbursement = true)}
																			checked={item.reimbursement}
																		/>
																		<span class=" text-sm text-gray-700"
																			>Our team will buy (and be reimbursed)</span
																		>
																	</label>
																</div>
															</div>
															<div class="flex justify-end mt-4">
																<button
																	type="button"
																	on:click={() => removePartAndCost(index)}
																	aria-label={`Remove part ${index + 1}`}
																	class="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
																>
																	Remove
																</button>
															</div>
														</div>
													</div>
												{/each}
											</div>
										{/if}

										<!-- flex first item 3x width of others -->
										<div class="flex space-x-4">
											<button
												type="button"
												on:click={addPartAndCost}
												class="flex-[3] px-6 py-3 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
											>
												Add Part
											</button>
											<button
												type="button"
												on:click={() => (showBulkPasteModal = true)}
												class="flex-[1] px-6 py-3 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
											>
												Bulk Paste
											</button>
										</div>
										<!-- Total Cost -->
										<div
											class="flex items-center justify-between border-2 border-orange-500 rounded-lg text-orange-500 p-3"
										>
											<p class="text-lg font-semibold text-orange-500">Total Cost:</p>
											<p class="text-lg font-semibold text-orange-500">
												${partsAndCosts
													.reduce((acc, item) => acc + item.cost * item.quantity, 0)
													.toFixed(2)}
											</p>
										</div>
										<BulkPasteModal show={showBulkPasteModal} on:paste={handleBulkPaste} />
									</div>

									<div class="space-y-2">
										<label for="images" class="text-xl font-semibold text-gray-700 block"
											>Images</label
										>
										<input
											type="file"
											id="images"
											on:change={handleImageUpload}
											accept="image/*"
											multiple
											class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300"
										/>

										{#each images as img (img)}
											<img
												src={img}
												alt="Uploaded"
												class="mt-4 max-w-full h-auto rounded-lg shadow-md"
											/>
										{/each}
									</div>

									<div class="space-y-2">
										<label for="attachments" class="text-xl font-semibold text-gray-700 block"
											>Attachments (PDFs)</label
										>
										<input
											type="file"
											id="attachments"
											on:change={handleAttachmentUpload}
											accept=".pdf,application/pdf"
											multiple
											class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ff8236] focus:border-transparent transition-all duration-300"
										/>

										{#each attachments as attachment}
											<div
												class="mt-4 p-3 border border-gray-200 rounded-lg shadow-sm bg-gray-50 flex items-center justify-between"
											>
												<div class="flex items-center space-x-3">
													<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
															clip-rule="evenodd"
														/>
													</svg>
													<span class="text-gray-700 font-medium">{attachment.name}</span>
													<span class="text-gray-500 text-sm">
														(Uploaded: {new Date(attachment.uploadDate).toLocaleDateString()})
													</span>
												</div>
												<a
													href={attachment.url}
													target="_blank"
													class="px-3 py-1 text-orange-500 border-orange-500 text-sm rounded transition-colors"
												>
													Download
												</a>
											</div>
										{/each}
									</div>

									<!-- Track Selection Checkboxes -->
									<div class="space-y-4">
										<h3 class="text-xl font-semibold text-gray-700">
											Submit for Track Consideration
										</h3>
										<div class="space-y-3">
											<!-- Track 1 -->
											<div class="flex items-center space-x-3">
												<input
													type="checkbox"
													id="track1"
													bind:checked={track1}
													class="h-5 w-5  text-white accent-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
												/>
												<label for="track1" class="text-lg text-gray-700 font-medium">
													Track 1
												</label>
											</div>

											<!-- Track 2 -->
											<div class="flex items-center space-x-3">
												<!-- extended deadine: re-enabled -->
												<input
													type="checkbox"
													id="track2"
													class="h-5 w-5  text-white accent-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
												/>
												<label for="track2" class="text-lg text-gray-700 font-medium">
													Track 2
												</label>
											</div>

											<!-- Innov18 -->
											<div class="flex items-center space-x-3">
												<input
													type="checkbox"
													id="innov18"
													bind:checked={innov18}
													class="h-5 w-5 text-white border-2 accent-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
												/>
												<label for="innov18" class="text-lg text-gray-700 font-medium">
													Innov18
												</label>
											</div>
										</div>
									</div>

									<button
										type="submit"
										class="w-full px-6 py-3 bg-[#ff8236] text-white text-xl font-semibold rounded-lg hover:bg-[#e67430] transition-colors"
									>
										SAVE DRAFT INFO
									</button>
								</form>

								{#if submissionStatus}
									<div
										class="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg"
										role="alert"
									>
										{submissionStatus}
									</div>
								{/if}
							</section>
						{/if}
					</div>
				{/if}

				<!-- display a QR code of the user's ID -->
				{#if userData}
					<div class="bg-white shadow-lg rounded-lg p-6 mb-8" transition:fade>
						<div class="flex flex-col sm:flex-row justify-between items-center mb-6">
							<h3 class="text-2xl font-extrabold mb-6 text-orange-500">CHECK-IN</h3>
						</div>
						<div class="flex flex-col items-center">
							{#if qrCodeDataUrl}
								<img src={qrCodeDataUrl} alt="QR Code" class="w-64 h-64" />
							{/if}
							<!-- Checkbox to RSVP for 10/4
						<div class="flex items-center">
							<input
								type="checkbox"
								id="teamMatching"
								bind:checked={rsvp104}
								class="rounded border-gray-300 text-orange-600 mb-6 shadow-sm focus:border-orange-300 focus:ring focus:ring-offset-0 focus:ring-orange-200 focus:ring-opacity-50 h-5 w-5"
							/>
							<label for="teamMatching" class="ml-3 text-lg mb-6 block text-gray-900"
								>RSVP for Team Matching on 10/4!</label
							>
						</div> -->

							<!-- Dropdown for Milk or Fruit Tea
						<select
							id="drink"
							bind:value={drink}
							class="block w-1/2 text-lg rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
						>
							<option value="">Select Drink</option>
							<option value="Milk Tea">Milk Tea</option>
							<option value="Fruit Tea">Fruit Tea</option>
						</select> -->
							<!-- Submit RSVP info -->

							<button
								on:click={updateRSVP}
								class="max-w-lg mt-8 py-2 px-4 border border-transparent rounded-md shadow-sm text-md text-white font-extrabold bg-orange-500 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
							>
								REGENERATE QR CODE
							</button>
						</div>
					</div>
				{/if}

				<div class="bg-white shadow-lg rounded-lg p-6 mb-8" transition:fade>
					<div class="flex flex-col sm:flex-row justify-between items-center mb-6">
						<h3 class="text-2xl font-extrabold text-[#5865F2]">DISCORD</h3>
					</div>

					<div class="flex justify-center">
						<!-- Connect with Discord -->
						<iframe
							src="https://discord.com/widget?id=1415352586407772223&theme=light"
							width="100%"
							height="500"
							title="Discord Server Widget"
							allowtransparency="true"
							frameborder="0"
							sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
						></iframe>
					</div>
					<div class="flex justify-center">
						{#if userVerified}
							<div class="">
								<DiscordLink size="large" />
							</div>
						{:else}
							<a
								href="https://discord.gg/tKkS6Y66nY"
								target="_blank"
								class="max-w-lg mt-8 py-2 px-4 border border-transparent rounded-md shadow-sm text-md font-semibold text-white bg-[#5865F2] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
							>
								JOIN!
							</a>
						{/if}
					</div>
				</div>

				<!-- Past Teams and Projects Section -->
				{#if pastTeamsData.length > 0 || allProjectsData.length > 0}
					<div class="bg-white shadow-lg rounded-lg p-6 mb-8" transition:fade>
						<div class="flex flex-col sm:flex-row justify-between items-center mb-6">
							<h3 class="text-2xl font-extrabold text-yellow-600">🏆🏆🏆</h3>
						</div>

						<!-- Past Teams Section -->
						{#if pastTeamsData.length > 0}
							<div class="mb-6">
								<h4 class="text-xl font-bold text-gray-800 mb-4">Past Teams</h4>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each pastTeamsData as team}
										<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<h5 class="font-semibold text-lg text-gray-900 mb-2">
												{team.name || 'Unnamed Team'}
											</h5>
											{#if team.year}
												<p class="text-sm text-gray-600 mb-2">Year: {team.year}</p>
											{/if}
											{#if team.members && team.members.length > 0}
												<p class="text-sm text-gray-600">Members: {team.members.length}</p>
											{/if}
											{#if team.track}
												<p class="text-sm text-gray-600">Track: {team.track}</p>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Past Projects Section -->
						{#if allProjectsData.length > 0}
							<div>
								<h4 class="text-xl font-bold text-gray-800 mb-4">Past Projects</h4>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each allProjectsData as project}
										<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<h5 class="font-semibold text-lg text-gray-900 mb-2">
												{project.title || 'Untitled Project'}
											</h5>
											{#if project.year}
												<p class="text-sm text-gray-600 mb-2">Year: {project.year}</p>
											{/if}
											{#if project.team}
												<p class="text-sm text-gray-600 mb-2">Team: {project.team}</p>
											{/if}
											{#if project.awards && project.awards.length > 0}
												<div class="mb-2">
													<p class="text-sm font-medium text-yellow-600">Awards:</p>
													<ul class="text-sm text-gray-600">
														{#each project.awards as award}
															<li class="flex items-center">
																<span class="text-yellow-500 mr-1">🏆</span>
																{award}
															</li>
														{/each}
													</ul>
												</div>
											{/if}
											{#if project.detail}
												<p class="text-sm text-gray-700 line-clamp-3">{project.detail}</p>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white bg-custom">
		<div class="relative z-100 text-center">
			<div class="p-4 max-w-6xl mx-auto">
				<h2 class="text-5xl font-extrabold mb-8 text-center text-orange-500 pt-28 mx-auto">
					DASHBOARD
				</h2>
			</div>
			{#if isLoading}
				<div class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
					<div
						class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"
					></div>
				</div>
			{:else}
				<p>Please login or return to home.</p>

				<button
					class="bg-orange-500 text-white px-4 py-2 rounded-lg mt-4"
					on:click={() => (window.location.href = '/')}>Home</button
				>
			{/if}
		</div>
	</div>
{/if}

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
