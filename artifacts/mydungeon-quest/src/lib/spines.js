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
  }
];

export const getSpine = (id) => SPINES.find((spine) => spine.id === id) || SPINES[0];
