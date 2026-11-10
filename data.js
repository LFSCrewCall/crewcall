// Seed data for the Crew Call prototype
window.CC_CONST = {
  // the first owner: becomes owner the first time they sign in (see supabase/schema.sql). No shared Gmail.
  FIRST_OWNER: "chanchrisna.lee@student.lfs.org.uk",
  ROLE_GROUPS: {
    "Direction & production": ["Director", "Producer", "Screenwriter", "1st AD", "2nd AD", "Script Supervisor", "Runner"],
    "Production office": ["Line Producer", "Production Manager", "Production Coordinator", "Location Manager"],
    "Camera": ["DoP", "Camera Operator", "1st AC / Focus Puller", "2nd AC", "DIT", "Stills / BTS"],
    "Lighting & grip": ["Gaffer", "Spark", "Key Grip", "Grip"],
    "Sound": ["Sound Recordist", "Boom Operator", "Sound Designer", "Composer"],
    "Art & costume": ["Production Designer", "Art Director", "Costume", "Hair & Make-up"],
    "Post": ["Editor", "Colourist", "VFX"],
    "Marketing": ["Unit Publicist", "Social Media & BTS", "Key Art & Poster", "Festival Strategy"],
    "Cast": ["Actor"]
  },
  TERMS: ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Graduation term", "Screenwriting", "Producing", "Film Marketing", "International Film Business", "Alumni", "Guest"],
  // order people move through, one step per teaching term
  PROGRESSION: ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Graduation term", "Alumni"],
  // Courses and how cohort codes work. Each person picks their cohort once and
  // Crew Call works out their term from it every term, using TERM_DATES below.
  // every: "term" = a new cohort starts every term and the number goes up by one.
  // anchor = one cohort we know: MAF217 is in Term 4 in Autumn 2026.
  // every: "year" = one-year course starting each September (3 terms).
  // ends = when a cohort finishes, if LFS doesn't give a date for that intake:
  //   "sept"     = Friday of the second week of the next Autumn term (MA Screenwriting, Producing and
  //                Film Marketing starting Sept 2026 finish on Fri 24 Sep 2027)
  //   "summer"   = the end of the third term
  //   "gradterm" = the end of the graduation term (MA Filmmaking; the real date varies by intake)
  // endByIntake = actual finishing dates from LFS, by intake. Admins can set these in Admin, School calendar.
  COURSES: [
    { id: "MAF", name: "MA Filmmaking", every: "term", prefix: "MAF", terms: 6, ends: "gradterm", endByIntake: {}, anchor: { code: 217, term: 4, periodId: "2026-aut" } },
    { id: "MASW", name: "MA Screenwriting", every: "year", prefix: "", label: "Screenwriting", terms: 3, ends: "sept", endByIntake: { "2026": "2027-09-24" } },
    { id: "MAFP", name: "MA Film Producing", every: "year", prefix: "", label: "Producing", terms: 3, ends: "sept", endByIntake: { "2026": "2027-09-24" } },
    { id: "MAFM", name: "MA Film Marketing", every: "year", prefix: "", label: "Film Marketing", terms: 3, ends: "sept", endByIntake: { "2026": "2027-09-24" } },
    // run with the University of Exeter: Term 1 in Exeter, Terms 2 and 3 at LFS
    { id: "MAIFB", name: "MA International Film Business", every: "year", prefix: "", label: "International Film Business", terms: 3, ends: "summer", endByIntake: {}, note: "Term 1 at the University of Exeter, Terms 2 and 3 at LFS" }
  ],
  // term and cohort can be changed for this many weeks after a term starts, then lock
  LOCK_WEEKS: 2,
  // official LFS full-term dates (lfs.org.uk/key-dates)
  // enrol = enrolment and induction days before each term (Autumn: new student enrolment;
  // Spring: new students only; Summer: enrolment and induction)
  TERM_DATES: [
    { id: "2026-aut", name: "Autumn 2026", start: "2026-09-14", end: "2026-12-04", enrol: ["2026-09-10", "2026-09-11"] },
    { id: "2027-spr", name: "Spring 2027", start: "2027-01-11", end: "2027-04-02", enrol: ["2027-01-07", "2027-01-08"] },
    { id: "2027-sum", name: "Summer 2027", start: "2027-05-04", end: "2027-07-23", enrol: ["2027-04-29", "2027-04-30"] },
    { id: "2027-aut", name: "Autumn 2027", start: "2027-09-13", end: "2027-12-03", enrol: ["2027-09-09", "2027-09-10"] },
    { id: "2028-spr", name: "Spring 2028", start: "2028-01-10", end: "2028-03-31", enrol: ["2028-01-06", "2028-01-07"] },
    { id: "2028-sum", name: "Summer 2028", start: "2028-05-02", end: "2028-07-21", enrol: ["2028-04-27", "2028-04-28"] },
    { id: "2028-aut", name: "Autumn 2028", start: "2028-09-11", end: "2028-12-01", enrol: ["2028-09-07", "2028-09-08"] },
    { id: "2029-spr", name: "Spring 2029", start: "2029-01-08", end: "2029-03-30", enrol: ["2029-01-04", "2029-01-05"] },
    { id: "2029-sum", name: "Summer 2029", start: "2029-04-30", end: "2029-07-20", enrol: ["2029-04-26", "2029-04-27"] }
  ],
  LFS_DOMAINS: ["lfs.org.uk", "student.lfs.org.uk"],
  PATHWAYS: ["External", "Directing", "Producing", "Cinematography", "Editing", "Sound", "Production Design", "Screenwriting", "Film Marketing", "International Film Business", "Documentary"],
  TYPES: ["Short fiction", "Documentary", "Music video", "Commercial", "Experimental", "Graduation film"],
  KIT_CATS: ["Camera", "Lenses", "Lighting", "Grip", "Sound", "Other"]
};

window.CC_SEED = {
  students: [
    { id: "s1", name: "Amara Okafor", email: "amara.okafor@student.lfs.org.uk", term: "Term 2", pathway: "Cinematography", roles: ["DoP", "Camera Operator", "Gaffer"], primary: "DoP", reel: "https://vimeo.com/amaraokafor", insta: "https://instagram.com/amara.frames", kit: [{cat:"Camera", item:"Sony FX3"}, {cat:"Lenses", item:"Sigma Art 18-35, 50mm"}], avail: [{from:"2026-11-09", to:"2026-11-15"}, {from:"2026-11-23", to:"2026-12-06"}], reel: "https://vimeo.com/", bio: "Naturalistic, handheld, low light. Shot two Term 1 shorts.", openToOffers: true },
    { id: "s2", name: "Tom Hughes", email: "tom.hughes@student.lfs.org.uk", term: "Term 1", pathway: "Sound", roles: ["Sound Recordist", "Boom Operator", "Sound Designer"], primary: "Sound Recordist", kit: [{cat:"Sound", item:"Zoom F6 + Rode NTG5"}, {cat:"Sound", item:"2x Deity wireless lavs"}], avail: [{from:"2026-11-06", to:"2026-11-30"}], reel: "", bio: "Will travel. Happy on docs and fiction.", openToOffers: true },
    { id: "s3", name: "Priya Raman", email: "priya.raman@student.lfs.org.uk", term: "Term 2", pathway: "Producing", roles: ["Producer", "1st AD", "2nd AD"], primary: "Producer", kit: [], avail: [{from:"2026-11-16", to:"2026-12-13"}], reel: "", bio: "Schedules, budgets, call sheets. I like a tight ship.", openToOffers: false },
    { id: "s4", name: "Lucas Moreau", email: "lucas.moreau@student.lfs.org.uk", term: "Term 4", pathway: "Editing", roles: ["Editor", "Colourist", "DIT"], primary: "Editor", site: "https://lucasmoreau.co.uk/", imdb: "https://www.imdb.com/name/nm0000001/", kit: [{cat:"Other", item:"DaVinci Resolve Studio + calibrated monitor"}], avail: [{from:"2026-11-06", to:"2026-12-20"}], reel: "https://vimeo.com/", bio: "Edit and grade. Can DIT on set if you need backups handled.", openToOffers: true },
    { id: "s5", name: "Hannah Lee", email: "hannah.lee@student.lfs.org.uk", term: "Term 1", pathway: "Production Design", roles: ["Production Designer", "Art Director", "Costume"], primary: "Production Designer", kit: [{cat:"Other", item:"Prop and fabric stash, van access"}], avail: [{from:"2026-11-12", to:"2026-11-22"}, {from:"2026-12-01", to:"2026-12-12"}], reel: "", bio: "Period and lived-in sets on small budgets.", openToOffers: false },
    { id: "s6", name: "Kwame Asante", email: "kwame.asante@student.lfs.org.uk", term: "Term 2", pathway: "Cinematography", roles: ["Gaffer", "Spark", "Key Grip", "1st AC / Focus Puller"], primary: "Gaffer", kit: [{cat:"Lighting", item:"Aputure 300d II, 2x Amaran 200x"}, {cat:"Grip", item:"C-stands, 6x6 frame"}], avail: [{from:"2026-11-07", to:"2026-11-29"}], reel: "", bio: "Lighting first, but I'll pull focus too.", openToOffers: true },
    { id: "s7", name: "Sofia Marín", email: "sofia.marin@student.lfs.org.uk", term: "Term 4", pathway: "Directing", roles: ["Director", "Script Supervisor", "Actor"], primary: "Director", kit: [], avail: [{from:"2026-11-20", to:"2026-12-04"}], reel: "", bio: "Directing my grad film in January. Keen to script supervise before then.", openToOffers: false },
    { id: "s8", name: "Ben Carter", email: "ben.carter@student.lfs.org.uk", term: "Term 1", pathway: "Cinematography", roles: ["2nd AC", "1st AC / Focus Puller", "Camera Operator", "Grip"], primary: "1st AC / Focus Puller", kit: [{cat:"Camera", item:"Tilta Nucleus wireless follow focus"}], avail: [{from:"2026-11-06", to:"2026-12-18"}], reel: "", bio: "Reliable AC. Learning fast.", openToOffers: true },
    { id: "s9", name: "Yuki Tanaka", email: "yuki.tanaka@student.lfs.org.uk", term: "Term 2", pathway: "Sound", roles: ["Sound Designer", "Composer", "Sound Recordist"], primary: "Composer", kit: [{cat:"Sound", item:"Sound Devices MixPre-6 II"}], avail: [{from:"2026-11-14", to:"2026-12-10"}], reel: "https://soundcloud.com/", bio: "Scores and sound design, ambient to orchestral.", openToOffers: true },
    { id: "s10", name: "Daniel Novak", email: "daniel.novak@student.lfs.org.uk", term: "Graduation term", pathway: "Producing", roles: ["Producer", "1st AD", "Runner"], primary: "1st AD", kit: [{cat:"Other", item:"Full driving licence, estate car"}], avail: [{from:"2026-11-06", to:"2026-11-20"}], reel: "", bio: "1st AD on six shorts. Can drive kit.", openToOffers: false },
    { id: "s11", name: "Ella Fitzgerald", email: "ella.fitzgerald@student.lfs.org.uk", term: "Term 1", pathway: "Screenwriting", roles: ["Script Supervisor", "Runner", "2nd AD", "Actor"], primary: "Script Supervisor", kit: [], avail: [{from:"2026-11-06", to:"2026-12-20"}], reel: "", bio: "Writer who wants to be on set as much as possible.", openToOffers: true },
    { id: "s12", name: "Marcus Bell", email: "marcus.bell@student.lfs.org.uk", term: "Term 4", pathway: "Cinematography", roles: ["DoP", "Camera Operator", "Stills / BTS"], primary: "DoP", kit: [{cat:"Camera", item:"Blackmagic Pocket 6K Pro"}, {cat:"Lenses", item:"Vintage Helios + Canon FD set"}, {cat:"Grip", item:"DJI RS3 Pro gimbal"}], avail: [{from:"2026-11-28", to:"2026-12-20"}], reel: "https://vimeo.com/", bio: "Music videos and textured looks.", openToOffers: true },
    { id: "s13", name: "Aisha Rahman", email: "aisha.rahman@student.lfs.org.uk", term: "Term 5", pathway: "Production Design", roles: ["Hair & Make-up", "Costume", "Art Director"], primary: "Hair & Make-up", kit: [{cat:"Other", item:"Full HMU kit, SFX basics"}], avail: [{from:"2026-11-09", to:"2026-11-27"}], reel: "", bio: "HMU and SFX wounds. Costume on smaller shoots.", openToOffers: true },
    { id: "s14", name: "Oliver Grant", email: "oliver.grant@student.lfs.org.uk", term: "Term 1", pathway: "Documentary", roles: ["Director", "Camera Operator", "Editor", "Sound Recordist"], primary: "Camera Operator", kit: [{cat:"Camera", item:"Canon C70"}, {cat:"Sound", item:"Sennheiser MKE 600"}], avail: [{from:"2026-11-16", to:"2026-11-28"}], reel: "", bio: "Self-shooting doc maker. One-person band if needed.", openToOffers: false },
    { id: "s15", name: "Zara Ahmed", email: "zara.ahmed@student.lfs.org.uk", term: "Term 2", pathway: "Editing", roles: ["VFX", "Editor", "Colourist"], primary: "VFX", kit: [{cat:"Other", item:"After Effects, Nuke non-commercial"}], avail: [{from:"2026-11-06", to:"2026-12-20"}], reel: "", bio: "Clean-up, compositing, titles.", openToOffers: true },
    { id: "s16", name: "Jamie O'Neill", email: "jamie.oneill@student.lfs.org.uk", term: "Graduation term", pathway: "Cinematography", roles: ["DoP", "Gaffer", "DIT"], primary: "DoP", kit: [{cat:"Camera", item:"RED Komodo 6K"}, {cat:"Lighting", item:"Nanlite Forza 500, tubes"}], avail: [{from:"2026-12-07", to:"2026-12-20"}], reel: "https://vimeo.com/", bio: "Grad DoP. Free after my own shoot wraps.", openToOffers: false }
  ],
  projects: [
    { id: "p1", title: "Salt Water", type: "Short fiction", term: "Term 2", director: "Sofia Marín", email: "sofia.marin@student.lfs.org.uk", locations: [{name:"Margate seafront", detail:"Beach hut interior and shoreline, 21–22 Nov", lat: 51.3893, lng: 1.3786 },{name:"Margate Old Town", detail:"Café interior, 23 Nov", lat: 51.3906, lng: 1.3829 }], logline: "Two estranged sisters scatter their father's ashes and can't agree on where.", shoots: [{from:"2026-11-21", to:"2026-11-23"}], roles: [{role:"Director", filledBy:"s7"}, {role:"DoP", filledBy:"s1"}, {role:"Gaffer", filledBy:null}, {role:"Sound Recordist", filledBy:null}, {role:"Producer", filledBy:"s3"}, {role:"1st AD", filledBy:null}, {role:"Hair & Make-up", filledBy:null}, {role:"Production Designer", filledBy:null}], kitNeeded: "Lighting kit for a beach-hut interior", created: "2026-11-02" },
    { id: "p2", title: "Night Bus", type: "Music video", term: "Term 1", director: "Oliver Grant", email: "oliver.grant@student.lfs.org.uk", locations: [{name:"N38 bus, Hackney to Victoria", detail:"Top deck, moving shots", lat: 51.5459, lng: -0.0553 },{name:"Dalston Junction bus stop", detail:"Opening and closing shots", lat: 51.5462, lng: -0.075 }], logline: "Music video for a local band, shot on the top deck of a moving N38.", shoots: [{from:"2026-11-14", to:"2026-11-14"}], roles: [{role:"Director", filledBy:"s14"}, {role:"Producer", filledBy:"s10"}, {role:"DoP", filledBy:null}, {role:"Gaffer", filledBy:"s6"}, {role:"1st AC / Focus Puller", filledBy:null}, {role:"Stills / BTS", filledBy:null}], kitNeeded: "Gimbal, small battery LEDs", created: "2026-11-01" },
    { id: "p3", delivery: "2027-01-22", title: "The Last Tenant", type: "Documentary", term: "Term 2", director: "Priya Raman", email: "priya.raman@student.lfs.org.uk", locations: [{name:"Aylesham Estate, Peckham", detail:"Flat interior and stairwells", lat: 51.4727, lng: -0.0689 },{name:"Peckham Rye Park", detail:"Walk-and-talk, 26 Nov", lat: 51.4594, lng: -0.0663 }], logline: "The final resident of a condemned estate block refuses to leave.", shoots: [{from:"2026-11-18", to:"2026-11-19"}, {from:"2026-11-26", to:"2026-11-26"}], roles: [{role:"Director", filledBy:"s3"}, {role:"Producer", filledBy:"s10"}, {role:"Camera Operator", filledBy:null}, {role:"Sound Recordist", filledBy:"s2"}, {role:"Editor", filledBy:"s4"}], kitNeeded: "Self-shooting camera with good low light", created: "2026-10-30" },
    { id: "p4", title: "Paper Crowns", type: "Graduation film", term: "Graduation term", director: "Daniel Novak", email: "daniel.novak@student.lfs.org.uk", locations: [{name:"Campus Studio 2", detail:"Den build, 5–7 Dec", lat: 51.5156, lng: -0.1213 },{name:"Epping Forest, Loughton Camp", detail:"Exteriors, 8–9 Dec. Generator needed", lat: 51.6506, lng: 0.0548 }], logline: "A boy king rules a forest den until the bulldozers arrive.", shoots: [{from:"2026-12-05", to:"2026-12-09"}], roles: [{role:"Director", filledBy:"s10"}, {role:"Producer", filledBy:null}, {role:"DoP", filledBy:"s16"}, {role:"1st AC / Focus Puller", filledBy:"s8"}, {role:"2nd AC", filledBy:null}, {role:"Gaffer", filledBy:null}, {role:"Spark", filledBy:null}, {role:"Sound Recordist", filledBy:null}, {role:"Boom Operator", filledBy:null}, {role:"Production Designer", filledBy:"s5"}, {role:"Costume", filledBy:null}, {role:"Script Supervisor", filledBy:null}, {role:"Runner", filledBy:null}], kitNeeded: "Haze machine, generator for forest days", created: "2026-10-20" },
    { id: "p5", title: "Static", type: "Experimental", term: "Term 1", director: "Ella Fitzgerald", email: "ella.fitzgerald@student.lfs.org.uk", locations: [{name:"Campus black box", detail:"Single set", lat: 51.5136, lng: -0.1256 }], logline: "A one-room piece about a radio that only picks up the future.", shoots: [{from:"2026-11-28", to:"2026-11-29"}], roles: [{role:"Director", filledBy:"s11"}, {role:"DoP", filledBy:null}, {role:"Sound Designer", filledBy:"s9"}, {role:"Actor", filledBy:null}, {role:"Gaffer", filledBy:null}], kitNeeded: "", created: "2026-11-04" },
    { id: "p6", title: "Brick & Bone", type: "Commercial", term: "Term 3", director: "Lucas Moreau", email: "lucas.moreau@student.lfs.org.uk", locations: [{name:"Bermondsey railway arches", detail:"Working bakery, early start", lat: 51.4996, lng: -0.0775 }], logline: "Spec ad for an independent bakery. 60 seconds, all macro.", shoots: [{from:"2026-11-12", to:"2026-11-12"}], roles: [{role:"Director", filledBy:"s4"}, {role:"Producer", filledBy:"s3"}, {role:"DoP", filledBy:"s12"}, {role:"Art Director", filledBy:null}, {role:"Key Grip", filledBy:null}], kitNeeded: "Macro lens, slider", created: "2026-11-03" },
    { id: "p7", title: "Undertow", type: "Short fiction", term: "Term 3", director: "Aisha Rahman", email: "aisha.rahman@student.lfs.org.uk", locations: [{name:"Tottenham Hale lido", detail:"Poolside and underwater", lat: 51.5884, lng: -0.0596 },{name:"Lido changing rooms", detail:"Interiors", lat: 51.5886, lng: -0.0592 }], logline: "A lifeguard keeps seeing the same swimmer go under.", shoots: [{from:"2026-12-12", to:"2026-12-13"}], roles: [{role:"Director", filledBy:"s13"}, {role:"DoP", filledBy:null}, {role:"Camera Operator", filledBy:null}, {role:"Sound Recordist", filledBy:null}, {role:"VFX", filledBy:"s15"}, {role:"Actor", filledBy:null}, {role:"Actor", filledBy:null}], producer: {name:"Grace Kim", email:"grace.kim@student.lfs.org.uk"}, kitNeeded: "Underwater housing if anyone has one", created: "2026-11-05" },
    { id: "p8", delivery: "2027-02-05", title: "Small Hours", type: "Short fiction", term: "Term 1", director: "Ben Carter", email: "ben.carter@student.lfs.org.uk", locations: [{name:"Kentish Town flat", detail:"Two flats on the same landing", lat: 51.5502, lng: -0.1408 },{name:"Royal Free Hospital car park", detail:"Exterior night scene, 3 Dec", lat: 51.5531, lng: -0.1651 }], logline: "A night-shift nurse and her insomniac neighbour, one long night.", shoots: [{from:"2026-12-02", to:"2026-12-03"}], roles: [{role:"Director", filledBy:"s8"}, {role:"Producer", filledBy:null}, {role:"DoP", filledBy:null}, {role:"Sound Recordist", filledBy:null}, {role:"Production Designer", filledBy:null}, {role:"1st AD", filledBy:null}, {role:"Editor", filledBy:null}], kitNeeded: "Practical lamps, tungsten look", created: "2026-11-05" }
  ]
};

// ---- accounts, permissions, schedules, requests (prototype seed) ----
(function () {
  const S = window.CC_SEED, st = id => S.students.find(s => s.id === id);
  const share = ["s1", "s2", "s3", "s4", "s6", "s8", "s10", "s11", "s15"];
  const learn = { s1: ["Colourist"], s5: ["Hair & Make-up"], s8: ["DoP", "Gaffer"], s11: ["1st AD", "Director"], s15: ["DIT"], s14: ["Producer"], s2: ["Composer"], s13: ["Production Designer"] };
  S.students.forEach((s, i) => { s.shareEmail = share.includes(s.id); s.learn = learn[s.id] || []; s.termFor = "2026-aut"; s.termConfirmed = true;
    const t = ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Graduation term"].indexOf(s.term) + 1;
    if (s.guest) return;
    if (t) { s.course = "MAF"; s.intake = 217 + 4 - t; } else if (s.term === "Alumni") { s.course = "MAF"; s.intake = 212 - (i % 3); }
  });
  S.students.push(
    { id: "s18", name: "Hana Okafor", email: "hana.okafor@student.lfs.org.uk", term: "Screenwriting", course: "MASW", intake: 2026, termFor: "2026-aut", termConfirmed: true, pathway: "Screenwriting", roles: ["Screenwriter", "Script Supervisor", "Runner"], primary: "Screenwriter", learn: ["1st AD"], kit: [], avail: [{ from: "2026-11-12", to: "2026-11-16" }, { from: "2026-11-27", to: "2026-12-06" }], reel: "", bio: "MA Screenwriting. Happy to be on set for script changes, or run continuity.", openToOffers: true, shareEmail: true },
    { id: "s19", name: "Tom Hughes", email: "tom.hughes@student.lfs.org.uk", term: "Producing", course: "MAFP", intake: 2026, termFor: "2026-aut", termConfirmed: true, pathway: "Producing", roles: ["Producer", "Line Producer", "Production Manager", "Location Manager"], primary: "Producer", learn: ["1st AD"], kit: [], avail: [{ from: "2026-11-10", to: "2026-11-22" }, { from: "2026-12-01", to: "2026-12-13" }], reel: "", bio: "MA Film Producing. Budgets, schedules, permits and recces.", openToOffers: true, shareEmail: false },
    { id: "s20", name: "Leila Haddad", email: "leila.haddad@student.lfs.org.uk", term: "Film Marketing", course: "MAFM", intake: 2026, termFor: "2026-aut", termConfirmed: true, pathway: "Film Marketing", roles: ["Unit Publicist", "Social Media & BTS", "Key Art & Poster", "Festival Strategy"], primary: "Unit Publicist", learn: ["Stills / BTS"], kit: [], avail: [{ from: "2026-11-12", to: "2026-11-23" }, { from: "2026-12-05", to: "2026-12-13" }], reel: "", bio: "MA Film Marketing. BTS for socials, press kits, posters and festival plans.", openToOffers: true, shareEmail: true },
    { id: "s21", name: "Jonah Price", email: "jonah.price@student.lfs.org.uk", term: "", course: "MAF", intake: 206, termFor: "2025-aut", termConfirmed: true, pathway: "Editing", roles: ["Editor"], primary: "Editor", learn: [], kit: [], avail: [], reel: "", bio: "Graduated. Editing features now.", openToOffers: false, shareEmail: false, updated: "2025-09-30" },
    { id: "s22", name: "Mia Laurent", email: "mia.laurent@student.lfs.org.uk", term: "", course: "MAF", intake: 208, termFor: "2026-aut", termConfirmed: true, pathway: "Sound", roles: ["Sound Recordist", "Boom Operator"], primary: "Sound Recordist", learn: [], kit: [], avail: [], reel: "", bio: "Alumni. Still happy to record sound on weekends.", openToOffers: true, shareEmail: false, updated: "2025-12-01" }
  );
  S.students.push({ id: "s17", name: "Rosa Delgado", email: "rosa.delgado.hmu@gmail.com", term: "Guest", pathway: "External", roles: ["Hair & Make-up", "Costume"], primary: "Hair & Make-up", learn: [], kit: [{ cat: "Other", item: "Pro HMU kit, airbrush, SFX blood" }], avail: [{ from: "2026-11-14", to: "2026-11-30" }], reel: "https://instagram.com/", bio: "Freelance HMU. Commercials and music videos. Invited by Aisha.", openToOffers: true, shareEmail: true, guest: true, invitedBy: "s13" });
  S.admins = ["s3", "s7"];
  // one owner (all permissions, can hand over); other admins get the permissions ticked for them
  S.owner = "s3";
  S.adminPerms = { s3: ["people", "projects", "setup", "email", "news", "send"], s7: ["projects", "setup", "news"] };
  S.settings = { senderName: "Crew Call", senderEmail: "", replyTo: "", repsTransfer: true, schoolAlias: "", digestDay: "Monday", digestTime: "08:00", retainMonths: 12, newsSecond: true, ltUrl: "" };
  S.customWords = {};
  S.transFixes = [
    { id: "tf1", page: "Crew", where: "Find crew", en: "1st AD", lang: "ru", now: "Первый ассистент режиссёра", better: "Второй режиссёр", why: "On Russian sets the 1st AD is called второй режиссёр. Wikidata says the same.", by: "s10", source: "Member", at: "2026-11-02", status: "open" }
  ];
  // safety reports (only admins with the Reports and privacy permission see these)
  S.reports = [
    { id: "r1", kind: "project", target: "p2", by: "s5", reason: "Safety on set", details: "The plan is to film on the top deck of a moving bus at night with no permit and no one watching the stairs. Can someone check before Saturday?", at: "2026-11-07", status: "open" }
  ];
  // scripts looking for a director or producer
  S.scripts = [
    { id: "sc1", by: "s18", title: "Low Tide", type: "Short fiction", pages: 12, logline: "A lifeboat volunteer has one night to decide whether to report the rescue that went wrong.", lookingFor: ["Director", "Producer"], aim: "Spring 2027", link: "https://docs.google.com/", attached: [], posted: "2026-11-02", status: "open" },
    { id: "sc2", by: "s18", title: "Ward Nine", type: "Short fiction", pages: 8, logline: "Two night porters run a betting ring on which patients will be discharged first.", lookingFor: ["Director", "Producer"], aim: "Summer 2027", link: "", attached: [{ sid: "s19", role: "Producer" }], posted: "2026-10-20", status: "open" },
    { id: "sc3", by: "s3", title: "Grandmother's Allotment", type: "Documentary", pages: 4, logline: "Treatment. A year on a Lewisham allotment as the council decides whether to sell it.", lookingFor: ["Director"], aim: "Spring 2027", link: "", attached: [], posted: "2026-11-05", status: "open" }
  ];
  S.scripts.forEach(x => (x.kind = "script"));
  S.scripts.push(
    { id: "pt1", kind: "pitch", by: "s19", title: "Last Orders", type: "Short fiction", pages: null, source: "Option on a published short story by a Peckham writer", logline: "On the final night of a South London pub, the landlady has to tell the regulars it's been sold to the people they hate.", lookingFor: ["Screenwriter", "Director"], aim: "Spring 2027", link: "https://docs.google.com/", attached: [], posted: "2026-11-07", status: "open" },
    { id: "pt2", kind: "pitch", by: "s10", title: "The Night Market", type: "Documentary", pages: null, source: "Access to a family-run Hackney night market", logline: "Three generations run a stall at a night market that's about to be redeveloped.", lookingFor: ["Director", "DoP"], aim: "Summer 2027", link: "", attached: [{ sid: "s14", role: "Director" }], posted: "2026-10-28", status: "open" }
  );
  // wrapped films looking for marketing and festival help
  S.releases = [
    { id: "rl1", by: "s7", pid: "p9", title: "Glasshouse", type: "Short fiction", runtime: 11, logline: "A botanist sleeps in her greenhouse to stop a thief.", needs: ["Festival strategy", "Poster & key art", "Trailer", "Press kit"], attached: [{ sid: "s20", need: "Festival strategy" }], deadline: "2026-12-01", festivals: "Clermont-Ferrand, Encounters", link: "https://vimeo.com/", posted: "2026-11-03", status: "open" },
    { id: "rl2", by: "s13", pid: null, title: "Moth Season", type: "Short fiction", runtime: 14, logline: "A teenage beekeeper hides a swarm in her nan's council flat.", needs: ["Poster & key art", "Socials & BTS", "Press kit"], attached: [], deadline: "2027-02-01", festivals: "BFI Future Film, Aesthetica", link: "", posted: "2026-10-25", status: "open" }
  ];
  // crowdfunding campaigns
  S.funds = [
    { id: "fu1", by: "s7", pid: "p1", title: "Salt Water", type: "Graduation film", platform: "Kickstarter", url: "https://www.kickstarter.com/", cur: "£", goal: 3000, raised: 1240, deadline: "2026-11-28", starts: "2026-10-29", posted: "2026-10-29", pitch: "Two estranged sisters scatter their father's ashes and can't agree on where. Help us get to the coast.", uses: "Beach hut hire, a van for kit, food for 18 crew over three days, and the grade.", cover: "" },
    { id: "fu2", by: "s8", pid: "p8", title: "Small Hours", type: "Short fiction", platform: "Seed&Spark", url: "https://seedandspark.com/", cur: "£", goal: 1500, raised: 1320, deadline: "2026-11-15", starts: "2026-10-20", posted: "2026-10-20", pitch: "A night-shift nurse and her insomniac neighbour, one long night. Nearly there.", uses: "Hospital car park permit, practical lights and a night of overtime for the location.", cover: "" },
    { id: "fu3", by: "s13", pid: null, title: "Moth Season", type: "Short fiction", platform: "Indiegogo", url: "https://www.indiegogo.com/", cur: "£", goal: 2000, raised: 2150, deadline: "2026-10-31", starts: "2026-09-20", posted: "2026-09-20", pitch: "A teenage beekeeper hides a swarm in her nan's council flat. Funded, thank you.", uses: "Bee wrangler, festival fees.", cover: "" }
  ];
  // wrapped shoots looking for editors, colourists, sound and music
  S.posts = [
    { id: "po1", by: "s14", pid: "p10", title: "Northern Line", type: "Documentary", runtime: 12, logline: "Buskers who've played the same tunnel for twenty years.", needs: ["Editing", "Colour grade", "Sound design & mix"], attached: [], deadline: "2026-12-14", where: "Either", software: "Premiere, Resolve", footage: "FX6 XAVC, about 900 GB", link: "https://drive.google.com/", posted: "2026-10-02", status: "open" },
    { id: "po2", by: "s13", pid: null, title: "Moth Season", type: "Short fiction", runtime: 14, logline: "A teenage beekeeper hides a swarm in her nan's council flat.", needs: ["Music", "VFX", "Titles & graphics"], attached: [], deadline: "2027-01-18", where: "Remote", software: "Resolve, After Effects", footage: "", link: "", posted: "2026-11-02", status: "open" },
    { id: "po3", by: "s5", pid: null, title: "Low Tide", type: "Short fiction", runtime: 9, logline: "Two brothers race the tide to scatter their father's ashes.", needs: ["Colour grade", "Sound design & mix"], attached: [], deadline: "", where: "On campus", software: "Avid, Pro Tools", footage: "ARRI ProRes 4K, about 2 TB", link: "", posted: "2026-11-07", status: "open" }
  ];
  S.postInterest = [
    { id: "pi1", post: "po1", sid: "s4", need: "Colour grade", msg: "I graded two Term 3 docs in Resolve. Free most evenings in December.", status: "pending", at: "2026-11-05" }
  ];
  S.releaseInterest = [
    { id: "ri1", rel: "rl1", sid: "s12", need: "Poster & key art", msg: "I took stills on the shoot. Happy to build a poster from frames.", status: "pending", at: "2026-11-06" }
  ];
  S.scriptInterest = [
    { id: "si1", scr: "sc1", sid: "s7", role: "Director", msg: "Love the ending. I'd shoot it in Margate, where we're shooting Salt Water.", status: "pending", at: "2026-11-06" }
  ];
  S.handover = { done: {}, notes: "Everything runs on the owner's school email. GitHub and Supabase are organisations: Sofia (rep, MAF217) is already an Owner on both. The email sender login is in the shared Bitwarden folder \"Crew Call\".", log: [{ at: "2026-06-20", from: "Former owner (Graduation term)", to: "Priya Raman" }] };
  // newsletters designed in Admin > Newsletter
  S.newsletters = [
    { id: "nl1", subject: "Welcome back: autumn term on Crew Call", preheader: "How to get on more shoots this term, and who's looking for crew.", issue: "Oct 2026", audience: "all", signoff: "From the Crew Call admins",
      blocks: [{ t: "heading", text: "New term, new shoots" }, { t: "text", text: "Term 1 have their first exercises coming up, and Term 4 are planning graduation-year shorts.\n\nMark your free days so directors can find you, and add the roles you want to learn so you can ask to shadow." }, { t: "auto", what: "roles", n: 3 }, { t: "button", label: "Mark my free days", url: "https://lfscrewcall.github.io/crewcall/#me/days" }],
      status: "sent", createdBy: "s3", editedBy: "s3", approvedBy: "s3", sentBy: "s3", sentAt: "2026-10-05", recipients: 19 },
    { id: "nl2", subject: "November: graduation shoots need you", preheader: "Salt Water, The Last Tenant and more are crewing up.", issue: "Nov 2026", audience: "all", signoff: "From the Crew Call admins",
      blocks: [{ t: "heading", text: "Big month for Term 4" }, { t: "text", text: "Four shoots go before the cameras this month. Most need sparks, grips and a runner or two, and every one is a credit on your profile." }, { t: "auto", what: "shoots", n: 4 }, { t: "divider" }, { t: "auto", what: "release", n: 2 }, { t: "text", text: "MA Film Marketing: two wrapped films are looking for festival plans, posters and press kits." }],
      status: "review", createdBy: "s7", editedBy: "s7", submittedBy: "s7", submittedAt: "2026-11-08" }
  ];
  // the automatic edition: built from Crew Call each time. Admins can change the words, not the design.
  S.nlAuto = { on: true, freq: "monthly", audience: "all", autoSend: false, subject: "What's on at Crew Call: {month}", preheader: "Open roles, shoots and paid work this month.",
    heading: "This month on Crew Call", intro: "Here's who needs crew, what's shooting and the paid work posted by students and alumni. School shoots are in kind, so the paid jobs are listed on their own.",
    signoff: "From the Crew Call admins",
    sections: [{ what: "roles", on: true, n: 4, title: "" }, { what: "shoots", on: true, n: 4, title: "" }, { what: "paid", on: true, n: 3, title: "" }, { what: "develop", on: true, n: 3, title: "" }, { what: "release", on: false, n: 3, title: "" }],
    lastSent: "2026-10-05", versions: [] };
  S.newsletters.forEach(n => (n.versions = n.versions || []));
  S.newsletters[1].versions.push({ at: "2026-11-08", by: "s7", why: "Asked for approval", data: JSON.parse(JSON.stringify({ subject: S.newsletters[1].subject, preheader: S.newsletters[1].preheader, issue: S.newsletters[1].issue, audience: S.newsletters[1].audience, signoff: S.newsletters[1].signoff, blocks: S.newsletters[1].blocks })) });
  S.adminVia = {};
  // one rep per cohort (cohort code -> person). Seeded below once cohorts are worked out.
  S.reps = { MAF217: "s7", MAF219: "s1", MAF220: "s11", MAF216: "s13" };
  S.ownerProposal = null;
  // paid work: outside jobs, unlike school shoots which are in kind
  S.gigs = [
    { id: "g1", by: "s10", title: "Brand film for Kiln Coffee Roasters", org: "Kiln Coffee Roasters", type: "Commercial", roles: ["Gaffer", "Spark"], rate: "£250 a day", payType: "Day rate", dates: [{ from: "2026-11-21", to: "2026-11-21" }], loc: "Hackney Wick", deadline: "2026-11-16", details: "One-day brand film in the roastery. Small lighting package provided. Lunch included.", apply: "", posted: "2026-11-05", status: "open" },
    { id: "g2", by: "s17", title: "Music video for an indie band", org: "Low Tide (band)", type: "Music video", roles: ["1st AC", "Runner"], rate: "£150 a day", payType: "Day rate", dates: [{ from: "2026-11-28", to: "2026-11-29" }], loc: "Peckham", deadline: "2026-11-20", details: "Two days, mostly night exteriors. Sony FX6. Travel paid.", apply: "", posted: "2026-11-07", status: "open" },
    { id: "g3", by: "s20", title: "Festival trailer edit", org: "Frame by Frame Festival", type: "Post-production", roles: ["Editor"], rate: "£400", payType: "Flat fee", dates: [{ from: "2026-12-01", to: "2026-12-12" }], loc: "Remote", deadline: "2026-11-24", details: "60-second and 30-second trailer cut from the festival selection. Premiere Pro, two rounds of notes.", apply: "", posted: "2026-11-08", status: "open" },
    { id: "g4", by: "s13", title: "Corporate conference coverage", org: "Northgate Events", type: "Corporate or event", roles: ["Camera Operator", "Sound Recordist"], rate: "£300 a day", payType: "Day rate", dates: [{ from: "2026-10-22", to: "2026-10-22" }], loc: "ExCeL London", deadline: "2026-10-15", details: "Panels and interviews, two cameras.", apply: "", posted: "2026-10-01", status: "filled" }
  ];
  S.gigApps = [{ id: "ga1", gig: "g1", sid: "s6", role: "Gaffer", msg: "Gaffed four graduation films, own Aputure kit.", at: "2026-11-06", status: "pending" }];
  S.adminLog = [{ at: "2026-11-08", by: "s7", text: "Asked for approval to send the newsletter \u201cNovember: graduation shoots need you\u201d" }, { at: "2026-10-05", by: "s3", text: "Sent the newsletter \u201cWelcome back: autumn term on Crew Call\u201d to 19 people" }, { at: "2026-10-02", by: "s3", text: "Made Sofia Marín an admin (projects, terms and lists, newsletter: draft)" }];
  S.invites = [
    { email: "rosa.delgado.hmu@gmail.com", by: "s13", at: "2026-10-28", status: "joined" },
    { email: "leo.sparks@outlook.com", by: "s6", at: "2026-11-04", status: "pending" }
  ];
  const P = id => S.projects.find(p => p.id === id);
  const sched = (id, map) => { P(id).days = map; };
  sched("p1", { "2026-11-21": { call: "06:30", wrap: "18:00", loc: 0 }, "2026-11-22": { call: "06:30", wrap: "18:00", loc: 0 }, "2026-11-23": { call: "08:00", wrap: "17:00", loc: 1 } });
  sched("p2", { "2026-11-14": { call: "21:00", wrap: "03:00", loc: 0 } });
  sched("p3", { "2026-11-18": { call: "09:00", wrap: "17:00", loc: 0 }, "2026-11-19": { call: "09:00", wrap: "17:00", loc: 0 }, "2026-11-26": { call: "10:00", wrap: "15:00", loc: 1 } });
  sched("p4", { "2026-12-05": { call: "08:00", wrap: "19:00", loc: 0 }, "2026-12-06": { call: "08:00", wrap: "19:00", loc: 0 }, "2026-12-07": { call: "08:00", wrap: "19:00", loc: 0 }, "2026-12-08": { call: "06:00", wrap: "17:00", loc: 1 }, "2026-12-09": { call: "06:00", wrap: "17:00", loc: 1 } });
  sched("p5", { "2026-11-28": { call: "10:00", wrap: "20:00", loc: 0 }, "2026-11-29": { call: "10:00", wrap: "20:00", loc: 0 } });
  sched("p6", { "2026-11-12": { call: "05:00", wrap: "13:00", loc: 0 } });
  sched("p7", { "2026-12-12": { call: "07:00", wrap: "16:00", loc: 0 }, "2026-12-13": { call: "09:00", wrap: "18:00", loc: 1 } });
  sched("p8", { "2026-12-02": { call: "14:00", wrap: "23:00", loc: 0 }, "2026-12-03": { call: "18:00", wrap: "04:00", loc: 1 } });
  // past projects for credits
  S.projects.push(
    { id: "p9", title: "Glasshouse", type: "Short fiction", term: "Term 2", director: "Sofia Marín", email: st("s7").email, locations: [{ name: "Camden glasshouse studio", detail: "Single location" , lat: 51.5405, lng: -0.145 }], logline: "A botanist sleeps in her greenhouse to stop a thief.", shoots: [{ from: "2026-10-10", to: "2026-10-11" }], roles: [{ role: "Director", filledBy: "s7" }, { role: "Producer", filledBy: "s3" }, { role: "DoP", filledBy: "s1" }, { role: "Gaffer", filledBy: "s6" }, { role: "Sound Recordist", filledBy: "s2" }, { role: "Hair & Make-up", filledBy: "s13" }], shadows: [{ role: "Gaffer", sid: "s8" }], kitNeeded: "", created: "2026-09-20", days: { "2026-10-10": { call: "07:00", wrap: "19:00", loc: 0 }, "2026-10-11": { call: "07:00", wrap: "19:00", loc: 0 } } },
    { id: "p10", delivery: "2026-12-14", title: "Northern Line", type: "Documentary", term: "Term 1", director: "Oliver Grant", email: st("s14").email, locations: [{ name: "Camden Town station", detail: "Platforms and concourse, permit 6–10am" , lat: 51.5392, lng: -0.1426 }], logline: "Buskers who've played the same tunnel for twenty years.", shoots: [{ from: "2026-09-26", to: "2026-09-27" }], roles: [{ role: "Director", filledBy: "s14" }, { role: "Producer", filledBy: "s10" }, { role: "Camera Operator", filledBy: "s8" }, { role: "Sound Recordist", filledBy: "s9" }, { role: "Stills / BTS", filledBy: "ext:Amara Okafor" }, { role: "Editor", filledBy: "s4" }], shadows: [{ role: "Producer", sid: "s11" }], kitNeeded: "", created: "2026-09-10", days: { "2026-09-26": { call: "06:00", wrap: "10:30", loc: 0 }, "2026-09-27": { call: "06:00", wrap: "10:30", loc: 0 } } }
  );
  S.projects.forEach(p => p.roles.forEach((r, i) => (r.rid = p.id + "r" + i)));
  // crew hub: WhatsApp group, key links and details (shown to locked crew by default)
  S.projects.forEach(p => (p.hub = { whatsapp: "", links: [], details: "", vis: "crew" }));
  P("p1").hub = { whatsapp: "https://chat.whatsapp.com/SaltWaterCrewDemo", links: [{ label: "Call sheet, day 1", url: "https://docs.google.com/document/d/salt-water-callsheet" }, { label: "Script (v4)", url: "https://drive.google.com/file/d/salt-water-script" }, { label: "Shared Drive folder", url: "https://drive.google.com/drive/folders/salt-water" }], details: "Minibus leaves campus 05:15 on 21 and 22 Nov.\nBring waterproofs and warm layers, the beach hut has no heating.\nVeggie and vegan lunch provided. Tell Priya about allergies.", vis: "crew" };
  P("p6").hub = { whatsapp: "https://chat.whatsapp.com/BrickBoneDemo", links: [{ label: "Shot list", url: "https://docs.google.com/spreadsheets/d/brick-bone-shots" }], details: "Nearest station: Bermondsey (Jubilee line). The bakery is working, so keep voices down before 06:00.", vis: "members" };
  const rid = (pid, role) => P(pid).roles.find(r => r.role === role && !r.filledBy).rid;
  S.requests = [
    { id: "q1", pid: "p1", rid: rid("p1", "Gaffer"), role: "Gaffer", sid: "s6", type: "crew", msg: "I can bring the Aputure 300d and two Amarans for the beach hut.", status: "pending", at: "2026-11-05" },
    { id: "q2", pid: "p1", rid: rid("p1", "Sound Recordist"), role: "Sound Recordist", sid: "s2", type: "crew", msg: "Free all three days, have the F6 and lavs.", status: "pending", at: "2026-11-05" },
    { id: "q3", pid: "p1", rid: rid("p1", "Hair & Make-up"), role: "Hair & Make-up", sid: "s17", type: "crew", msg: "Happy to travel to Margate.", status: "pending", at: "2026-11-06" },
    { id: "q4", pid: "p5", rid: rid("p5", "DoP"), role: "DoP", sid: "s1", type: "crew", msg: "Love the idea. I'm free both days.", status: "pending", at: "2026-11-04" }
  ];
  S.notifications = [
    { id: "n1", to: "s3", kind: "request", text: "Kwame Asante asked to join Salt Water as Gaffer", pid: "p1", at: "2026-11-05", read: false, emailed: true },
    { id: "n2", to: "s3", kind: "request", text: "Tom Hughes asked to join Salt Water as Sound Recordist", pid: "p1", at: "2026-11-05", read: false, emailed: true },
    { id: "n3", to: "s3", kind: "request", text: "Rosa Delgado asked to join Salt Water as Hair & Make-up", pid: "p1", at: "2026-11-06", read: false, emailed: true },
    { id: "n4", to: "s1", kind: "match", text: "New role that fits you: DoP on Small Hours. You're free every shoot day.", pid: "p8", at: "2026-11-05", read: false, emailed: true }
  ];
})();
