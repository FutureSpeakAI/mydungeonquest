function beats(act, titles) {
  return titles.map(([key, title, goal]) => ({ act, key, title, goal }));
}

export const SPINES = [
  {
    id: 'classic-epic', label: 'Classic Epic', revealIdx: 8,
    beats: [
      ...beats(1, [
        ['ordinary', 'The Ordinary Flame', 'Establish the hero, home, and what deserves protection.'],
        ['disturbance', 'A Shadow at the Door', 'Disrupt safety with evidence of a larger design.'],
        ['refusal', 'The Cost of Staying', 'Make inaction emotionally and materially costly.'],
        ['mentor', 'A Hand on the Map', 'Introduce guidance, a gift, or a dangerous truth.'],
        ['threshold', 'Beyond the Known Road', 'Cross into the wider conflict by irreversible choice.']
      ]),
      ...beats(2, [
        ['trials', 'Road of Teeth and Lanterns', 'Test values through allies, enemies, and difficult bargains.'],
        ['approach', 'The Enemy’s Weather', 'Draw near the design while the world visibly worsens.'],
        ['ordeal', 'The First Great Ruin', 'Demand sacrifice and expose the hero’s deepest weakness.'],
        ['revelation', 'The Half-Lit Design', 'Reveal the villain’s true design and personal connection.'],
        ['counterstroke', 'The Stolen Fire', 'Let the hero seize knowledge, leverage, or dangerous power.']
      ]),
      ...beats(3, [
        ['return', 'The Road Burns Behind', 'Force a costly return toward the threatened heartland.'],
        ['reckoning', 'All Debts Gather', 'Bring bonds, wounds, and neglected consequences into one arena.'],
        ['climax', 'The Last Gate', 'Resolve the central conflict through earned choices and mechanics.'],
        ['renewal', 'What the Dawn Keeps', 'Show the world changing because of the hero’s acts.'],
        ['epilogue', 'The Story After', 'Give the hero, bonds, and wounded lands a truthful ending.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['villain', 'family'] }, { byBeat: 4, roles: ['mentor'] },
      { byBeat: 6, roles: ['ally', 'vendor'] }, { byBeat: 8, roles: ['love_interest', 'boss'] },
      { byBeat: 10, roles: ['teacher'] }
    ]
  },
  {
    id: 'mystery', label: 'Mystery', revealIdx: 9,
    beats: [
      ...beats(1, [
        ['incident', 'The Impossible Detail', 'Present a contradiction that cannot be ignored.'],
        ['stake', 'A Name in the Margin', 'Tie the mystery to someone or somewhere the hero values.'],
        ['first-theory', 'A Plausible Lie', 'Offer an attractive explanation with one fatal weakness.'],
        ['threshold', 'Behind the Locked Door', 'Commit the hero to investigation and consequence.']
      ]),
      ...beats(2, [
        ['network', 'The Web of Motives', 'Populate suspects, allies, and institutions with conflicting goals.'],
        ['pressure', 'Someone Notices', 'Make investigation provoke resistance and changing evidence.'],
        ['reversal', 'The Witness Is Wrong', 'Overturn a core assumption without invalidating prior clues.'],
        ['buried', 'What Was Buried', 'Find a historical wound beneath the immediate crime.'],
        ['trap', 'The Elegant Trap', 'Tempt the hero into a conclusion engineered by the villain.'],
        ['revelation', 'The Pattern Speaks', 'Reveal the design through accumulated, fair evidence.']
      ]),
      ...beats(3, [
        ['proof', 'A Case That Can Bleed', 'Secure proof while the antagonist moves to erase it.'],
        ['confrontation', 'Every Mask at Once', 'Confront the truth, motives, and human cost.'],
        ['aftermath', 'The Unquiet Answer', 'Resolve consequences while preserving any honest ambiguity.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['family', 'villain'] }, { byBeat: 4, roles: ['mentor', 'ally'] },
      { byBeat: 6, roles: ['vendor', 'teacher'] }, { byBeat: 8, roles: ['love_interest', 'boss'] }
    ]
  },
  {
    id: 'heist', label: 'Heist', revealIdx: 8,
    beats: [
      ...beats(1, [
        ['score', 'The Impossible Score', 'Define the prize, target, and why normal methods fail.'],
        ['crew', 'A Table of Knives', 'Gather specialists whose goals complicate the job.'],
        ['intel', 'Blueprints and Ghosts', 'Learn defenses while revealing hidden personal stakes.'],
        ['plan', 'The Beautiful Lie', 'Commit to a plan with explicit contingencies and weaknesses.']
      ]),
      ...beats(2, [
        ['entry', 'Inside the Teeth', 'Enter the target and spend the first precious resource.'],
        ['complication', 'The Guard Who Shouldn’t Be Here', 'Introduce a fair but destabilizing complication.'],
        ['pivot', 'Plan B Has a Pulse', 'Force improvisation that tests trust among the crew.'],
        ['vault', 'The Heart of the Machine', 'Reach the prize and reveal what the score truly enables.'],
        ['betrayal', 'Someone Changes the Price', 'Expose a betrayal, divided loyalty, or deeper design.']
      ]),
      ...beats(3, [
        ['escape', 'Run Through the Fire', 'Escape as every prior choice compounds.'],
        ['settlement', 'Shares and Scars', 'Settle debts, loyalties, and ownership of the prize.'],
        ['legend', 'The Version They Tell', 'Show what became of the crew and their impossible act.']
      ])
    ],
    deadlines: [
      { byBeat: 1, roles: ['villain'] }, { byBeat: 3, roles: ['ally', 'vendor', 'teacher'] },
      { byBeat: 5, roles: ['mentor', 'family'] }, { byBeat: 7, roles: ['love_interest', 'boss'] }
    ]
  },
  {
    id: 'horror-survival', label: 'Horror Survival', revealIdx: 9,
    beats: [
      ...beats(1, [
        ['unease', 'Something Is Slightly Wrong', 'Create a specific breach in ordinary reality.'],
        ['isolation', 'The Road Closes', 'Remove easy escape without removing player agency.'],
        ['first-loss', 'Proof with Teeth', 'Confirm danger through a consequential but PG-13 loss.'],
        ['rules', 'The Shape of Hunger', 'Let the survivors infer one reliable rule of the threat.']
      ]),
      ...beats(2, [
        ['shelter', 'A Bad Place to Be Safe', 'Offer temporary shelter with social or structural weakness.'],
        ['fracture', 'Fear Chooses Sides', 'Split priorities while maintaining believable bonds.'],
        ['expedition', 'Into the Breathing Dark', 'Seek a resource or truth outside safety.'],
        ['false-dawn', 'Morning That Isn’t', 'Offer apparent relief that conceals escalation.'],
        ['siege', 'Every Door Knows Your Name', 'Make the threat converge on the survivors.'],
        ['revelation', 'Why It Came', 'Reveal the design and the price of ending it.']
      ]),
      ...beats(3, [
        ['ordeal', 'The Narrowest Way', 'Force passage through the most personal fear.'],
        ['countermeasure', 'A Weapon Made of Truth', 'Build an earned plan from learned rules.'],
        ['last-night', 'The Last Night', 'Resolve survival and sacrifice in the final confrontation.'],
        ['after', 'Those Who Saw Dawn', 'Show survival’s cost and the world’s remaining wound.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['family', 'villain'] }, { byBeat: 4, roles: ['mentor', 'ally'] },
      { byBeat: 6, roles: ['vendor', 'teacher'] }, { byBeat: 8, roles: ['love_interest', 'boss'] }
    ]
  },
  // THE BREADTH LAW (Directive XII §V.1) — five new spines, each with a
  // villain of a distinct shape. Threshold indexes are pinned by §I.3:
  // L2 = first beat of Act II, L3 = revealIdx, L4 = first beat of Act III,
  // L5 = the final beat. The acts below are built to land those numbers.
  {
    // The Fallen Mentor — a teacher the hero once trusted, corrupting what
    // they taught. 14 beats: Act I 0-3, Act II 4-9 (reveal 8), Act III 10-13.
    id: 'redemption-road', label: 'Redemption Road', revealIdx: 8,
    beats: [
      ...beats(1, [
        ['ashes', 'What the Fire Left', 'Establish the hero’s old wrong, its cost, and the teacher who shaped it.'],
        ['summons', 'A Letter in a Dead Hand', 'Call the hero back toward the wound with proof the past is moving again.'],
        ['weight', 'The Price of Looking Away', 'Make refusing the road cost someone the hero still owes.'],
        ['threshold', 'The First Honest Step', 'Commit the hero to repair by an irreversible public act.']
      ]),
      ...beats(2, [
        ['penance', 'Work Done With Bare Hands', 'Test resolve with amends that help slowly and cost immediately.'],
        ['doubt', 'Those Who Remember', 'Confront witnesses of the old wrong whose forgiveness is not owed.'],
        ['echo', 'The Teacher’s Grammar', 'Show the mentor’s corrupted teaching spreading through younger hands.'],
        ['bargain', 'A Shorter Road Offered', 'Tempt the hero with absolution that sends the bill to someone else.'],
        ['revelation', 'The Lesson Was the Trap', 'Reveal the fallen mentor’s design and the hero’s place inside it.'],
        ['break', 'Unlearning the Knife', 'Force the hero to set down the mentor’s best gift to stop its worst use.']
      ]),
      ...beats(3, [
        ['return', 'Back Along the Scar', 'Return to the site of the old wrong as the design closes on it.'],
        ['stand', 'A Student No Longer', 'Face the mentor with earned difference, not borrowed strength.'],
        ['climax', 'The Last Correction', 'Resolve the conflict so repair outweighs punishment or excuse.'],
        ['epilogue', 'What Mending Holds', 'Show what the amends built and what stays honestly broken.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['villain', 'family'] }, { byBeat: 4, roles: ['mentor'] },
      { byBeat: 6, roles: ['ally', 'vendor'] }, { byBeat: 8, roles: ['love_interest', 'boss'] },
      { byBeat: 10, roles: ['teacher'] }
    ]
  },
  {
    // The Patient Warlord — wins by waiting, offers terms like a knife
    // offers rest. 13 beats: Act I 0-3, Act II 4-8 (reveal 7), Act III 9-12.
    id: 'siege-of-home', label: 'The Siege of Home', revealIdx: 7,
    beats: [
      ...beats(1, [
        ['walls', 'The Shape of Enough', 'Establish home, its people, and the peace worth keeping.'],
        ['banners', 'Smoke on the Far Field', 'Bring first word of the warlord who wins by waiting.'],
        ['terms', 'A Generous Knife', 'Deliver terms of surrender kind enough to divide the town.'],
        ['threshold', 'The Gate Bars Shut', 'Choose resistance by an act that cannot be taken back.']
      ]),
      ...beats(2, [
        ['rationing', 'Hunger Does Arithmetic', 'Test bonds as supplies, patience, and tempers thin together.'],
        ['sally', 'A Door Opened Once', 'Risk a sortie that buys hope and pays for it in trust.'],
        ['sappers', 'Quiet Under the Stones', 'Reveal the slow works undermining wall, well, or will.'],
        ['revelation', 'The Patience Explained', 'Reveal why the warlord waits and what the town truly holds.'],
        ['fracture', 'Voices for the Gate', 'Face a faction ready to open the gate on the warlord’s terms.']
      ]),
      ...beats(3, [
        ['resolve', 'What the Walls Are For', 'Reforge the defenders around what surrender would actually cost.'],
        ['storm', 'The Patient Man Stands Up', 'Meet the assault the whole siege was arranged to make easy.'],
        ['climax', 'The Last Wall Is People', 'Resolve the siege by earned stratagem, cost, and choice.'],
        ['epilogue', 'Rebuilt With Names', 'Show the town after, keeping what the siege taught it.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['family', 'villain'] }, { byBeat: 4, roles: ['mentor', 'ally'] },
      { byBeat: 6, roles: ['vendor', 'teacher'] }, { byBeat: 8, roles: ['love_interest', 'boss'] }
    ]
  },
  {
    // The Salt Sovereign — a sea with a will and a court; weather as
    // intention. 14 beats: Act I 0-3, Act II 4-9 (reveal 9), Act III 10-13.
    id: 'long-voyage', label: 'The Long Voyage', revealIdx: 9,
    beats: [
      ...beats(1, [
        ['harbor', 'The Tide Ledger', 'Establish the cargo, the crew, and why this crossing cannot wait.'],
        ['omen', 'Weather With Opinions', 'Show the sea acting with intention no chart explains.'],
        ['cast-off', 'Ropes Let Go', 'Commit to open water against sound advice and better seasons.'],
        ['threshold', 'Past the Last Light', 'Pass the final landmark into waters that answer to something.']
      ]),
      ...beats(2, [
        ['becalmed', 'A Flat and Listening Sea', 'Test the crew when the wind is withheld like a favor.'],
        ['port', 'The Island That Trades', 'Bargain at a strange port where the currency is obedience.'],
        ['storm', 'The Sovereign Clears Its Throat', 'Survive weather sent as a message, not a season.'],
        ['stowaway', 'What the Hold Kept', 'Expose a secret aboard that the sea has been following.'],
        ['parley', 'A Court of Spray and Teeth', 'Treat with the Salt Sovereign’s heralds and learn its price.'],
        ['revelation', 'Why the Sea Wants This', 'Reveal the sovereign’s design and the voyage’s true cargo.']
      ]),
      ...beats(3, [
        ['tack', 'Against the Named Wind', 'Choose a course the sovereign has forbidden, and pay to hold it.'],
        ['eye', 'The Still Center', 'Cross the heart of the sovereign’s power at the crew’s full cost.'],
        ['climax', 'Landfall or Judgment', 'Resolve the crossing on earned seamanship and kept promises.'],
        ['epilogue', 'What the Log Records', 'Show the shore reached, the sea’s memory, and the crew changed.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['family', 'villain'] }, { byBeat: 4, roles: ['mentor', 'ally'] },
      { byBeat: 6, roles: ['vendor', 'teacher'] }, { byBeat: 8, roles: ['love_interest', 'boss'] }
    ]
  },
  {
    // The Smiling Usurper — legitimacy stolen by paper, kindness, and
    // witnesses. 13 beats: Act I 0-3, Act II 4-8 (reveal 8), Act III 9-12.
    id: 'crown-intrigue', label: 'Crown Intrigue', revealIdx: 8,
    beats: [
      ...beats(1, [
        ['court', 'The Order of Precedence', 'Establish the court, the crown’s health, and the hero’s small place.'],
        ['paper', 'A Signature Too Many', 'Surface the first document that says what no one remembers agreeing.'],
        ['favor', 'Kindness With a Ledger', 'Accept help from the usurper and feel the debt attach.'],
        ['threshold', 'Spoken in the Wrong Room', 'Commit to the tangle by a truth said where walls listen.']
      ]),
      ...beats(2, [
        ['alliances', 'Dance Cards and Daggers', 'Navigate factions whose smiles are contracts in draft.'],
        ['witness', 'The One Who Saw It Signed', 'Chase a witness the paper trail keeps almost producing.'],
        ['scandal', 'A Reputation Spent', 'Sacrifice standing to keep a thread of proof alive.'],
        ['gambit', 'The Loyal Accusation', 'Survive being named the traitor by the person stealing the crown.'],
        ['revelation', 'Legitimacy, Notarized', 'Reveal the usurper’s whole design and its lawful face.']
      ]),
      ...beats(3, [
        ['muster', 'Counting True Friends', 'Gather the few whose loyalty survived being expensive.'],
        ['session', 'The Court Convenes', 'Force the proof into the one room where it must be heard.'],
        ['climax', 'The Smile Breaks', 'Resolve the intrigue where paper, witnesses, and nerve meet.'],
        ['epilogue', 'What the Realm Signs Next', 'Show the crown’s new weather and the price of clean hands.']
      ])
    ],
    deadlines: [
      { byBeat: 2, roles: ['family', 'villain'] }, { byBeat: 4, roles: ['mentor', 'ally'] },
      { byBeat: 6, roles: ['vendor', 'teacher'] }, { byBeat: 8, roles: ['love_interest', 'boss'] }
    ]
  },
  {
    // The False Prophet — belief farmed as a crop, hope collected as rent.
    // 12 beats: Act I 0-3, Act II 4-8 (reveal 7), Act III 9-11.
    id: 'pilgrim-lie', label: 'The Pilgrim’s Lie', revealIdx: 7,
    beats: [
      ...beats(1, [
        ['road', 'Dust and Good Company', 'Establish the pilgrimage, its promise, and the hero’s reason to walk.'],
        ['signs', 'Miracles on Schedule', 'Show wonders that arrive a little too conveniently timed.'],
        ['tithe', 'Hope, Collected Weekly', 'Feel the movement’s gentle arithmetic close around the pilgrims.'],
        ['threshold', 'Past the Turning Stone', 'Commit to the road’s end despite the first unpayable ask.']
      ]),
      ...beats(2, [
        ['flock', 'Shepherds and Shears', 'Meet the faithful, the fleeced, and the ones who do the counting.'],
        ['doubt', 'A Miracle, Rehearsed', 'Catch the machinery of one wonder without killing the hope it fed.'],
        ['test', 'The Prophet’s Favor', 'Be lifted into the inner circle where belief is bookkeeping.'],
        ['revelation', 'The Crop Is Faith', 'Reveal the false prophet’s design and where the harvest goes.'],
        ['cost', 'What Believing Bought', 'Face what the lie has already taken from someone the hero loves.']
      ]),
      ...beats(3, [
        ['witness', 'Saying the Quiet Plainly', 'Choose truth-telling that risks the flock turning on the teller.'],
        ['climax', 'The Shrine of Receipts', 'Resolve the pilgrimage where the lie, the ledger, and the faithful meet.'],
        ['epilogue', 'Roads After Belief', 'Show what honest hope survives and who keeps walking.']
      ])
    ],
    deadlines: [
      { byBeat: 1, roles: ['villain'] }, { byBeat: 3, roles: ['ally', 'vendor', 'teacher'] },
      { byBeat: 5, roles: ['mentor', 'family'] }, { byBeat: 7, roles: ['love_interest', 'boss'] }
    ]
  }
];

export const getSpine = (id) => SPINES.find((spine) => spine.id === id) || SPINES[0];
