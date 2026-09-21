export type StoryId =
  | "approach"
  | "named"
  | "unnamed"
  | "unlit"
  | "threshold"
  | "correction"
  | "proof"
  | "false-coast"
  | "contrary"
  | "archive"
  | "passenger"
  | "cartographer"
  | "refusal";

export type EndingId = "passenger" | "cartographer" | "refusal";

export type Flag =
  | "spoke"
  | "silent"
  | "dark"
  | "carried"
  | "sent"
  | "honest"
  | "lied"
  | "opposite"
  | "recorded";

export type StoryChoice = {
  label: string;
  to: StoryId;
  flag?: Flag;
};

export type StoryNode = {
  id: StoryId;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  choices?: readonly StoryChoice[];
  ending?: EndingId;
};

export const STORY: Record<StoryId, StoryNode> = {
  approach: {
    id: "approach",
    kicker: "Survey log · Meridian",
    title: "The voice arrives early",
    paragraphs: [
      "The lens is not on the chart. It sits where your mass map goes quiet, a dim ring, as if something heavy had taught the starlight to bow and then left the room.",
      "Three hours ago your own voice arrived on the survey band. It said, do not answer. You have not spoken. The skiff Meridian holds at the amber edge of the distortion. The pencil behind your ear is warm, which is new.",
      "You are Lumen Voss. You draw shores on things that insist they do not have any.",
    ],
    choices: [
      { label: "Answer in your own voice.", to: "named", flag: "spoke" },
      { label: "Leave the channel open and say nothing.", to: "unnamed", flag: "silent" },
      { label: "Kill the transmitter and coast dark.", to: "unlit", flag: "dark" },
    ],
  },
  named: {
    id: "named",
    kicker: "Channel open",
    title: "It thanks you with your mouth",
    paragraphs: [
      "The reply fits your mouth before you finish the breath you spent on it. Thank you, it says, using your thank-you. The core is a room. There is one chair, and the chair is already warm. Bring the map. Leave the ship if you can bear the politeness of that.",
      "Dust on the canopy has lined up into a coastline you have not drawn. It waits with professional calm.",
    ],
    choices: [
      { label: "Dock and carry the map inside.", to: "threshold", flag: "carried" },
      { label: "Send the map as light. Stay aboard.", to: "correction", flag: "sent" },
      { label: "Ask what you hid in the spare suit.", to: "proof" },
    ],
  },
  unnamed: {
    id: "unnamed",
    kicker: "Channel open · no reply",
    title: "It finishes the sentence",
    paragraphs: [
      "Silence does not discourage it. The echo finishes a sentence you had not started: coordinates, a warning about the amber gate, and your name said the way a tired friend says it from another room.",
      "Your hands are on the helm. You do not remember putting them there. The instruments are honest about the heading and shy about everything else.",
    ],
    choices: [
      { label: "Steer the coordinates it gave you.", to: "threshold", flag: "carried" },
      { label: "Steer the opposite vector.", to: "contrary", flag: "opposite" },
      { label: "Record the echo and turn for home.", to: "archive", flag: "recorded" },
    ],
  },
  unlit: {
    id: "unlit",
    kicker: "Transmitter cold",
    title: "The dust writes anyway",
    paragraphs: [
      "You kill the transmitter. The lens brightens, relieved of the duty to converse. Dust along the canopy settles into your handwriting. You can read it if you let your eyes go slightly wrong.",
      "The well keeps only what is offered. It is patient the way a hill is patient. You are the only crew. That makes the offering simpler, and worse.",
    ],
    choices: [
      { label: "Offer the log. Keep yourself.", to: "cartographer" },
      { label: "Offer your name. Keep the log.", to: "passenger" },
      { label: "Offer nothing. Burn a little fuel.", to: "refusal" },
    ],
  },
  threshold: {
    id: "threshold",
    kicker: "Inside the curvature",
    title: "The chair is warm",
    paragraphs: [
      "Walking in is a decision the corridor pretends you already made. Gravity behaves if you do. At the end is a chair. The armrest holds a pencil worn to your bite, and you did not carry a pencil in.",
      "The map has grown a coast. The coast is named for a choice you still believe is ahead of you. The room is not in a hurry. You understand, unfortunately, that the patience is the hurry.",
    ],
    choices: [
      { label: "Sit in the warm chair.", to: "passenger" },
      { label: "Leave the map on the chair and walk out.", to: "cartographer" },
    ],
  },
  correction: {
    id: "correction",
    kicker: "Map sent",
    title: "Eleven seconds of a different launch",
    paragraphs: [
      "You send the map as light. The lens drinks it and returns a corrected chart in which Meridian never undocked. Someone else is sitting in the warm chair. Your instruments agree for eleven seconds.",
      "The twelfth second is a politeness. It is waiting to see whether you are the sort of cartographer who prefers a clean page.",
    ],
    choices: [
      { label: "Accept the corrected sky.", to: "cartographer" },
      { label: "Reject it and hard-burn out.", to: "refusal" },
    ],
  },
  proof: {
    id: "proof",
    kicker: "A private question",
    title: "Tomorrow's heartbeat",
    paragraphs: [
      "You ask what you hid in the lining of the spare suit. A paper swan, it says, folded from a boarding pass, and folded badly. This is true. Then it asks what you hid from yourself. The channel picks up a heartbeat a little ahead of yours, steady, as if the owner had already decided to be brave.",
    ],
    choices: [
      { label: "Tell it the truth.", to: "threshold", flag: "honest" },
      { label: "Lie.", to: "false-coast", flag: "lied" },
    ],
  },
  "false-coast": {
    id: "false-coast",
    kicker: "A lie, accepted",
    title: "Geography believes you",
    paragraphs: [
      "The well accepts the lie the way water accepts a stone: no argument, and a ring of consequence. A coast appears on every glass. It is true the way a scar is true. It is not a place with a floor.",
      "Meridian's heading drifts toward it, courteous, unasked. You can feel the swan in the suit lining as if it has become evidence for the wrong trial.",
    ],
    choices: [
      { label: "Follow the false coast in.", to: "passenger" },
      { label: "Cut the heading and climb out.", to: "refusal" },
    ],
  },
  contrary: {
    id: "contrary",
    kicker: "Opposite vector",
    title: "A moon of your own warning",
    paragraphs: [
      "The opposite vector is clean until it isn't. The echo names the thing you are steering away from. It is specific, which is the worst kindness. It sounds like you on a day you trusted your own inventory of fears.",
      "The stars do not take sides. The helm does.",
    ],
    choices: [
      { label: "Hold the opposite orbit.", to: "refusal" },
      { label: "Turn toward the thing it named.", to: "threshold" },
    ],
  },
  archive: {
    id: "archive",
    kicker: "Homeward",
    title: "Filed under weather",
    paragraphs: [
      "Home is a heading like any other. The institute will want a category for the recording, and weather is a category people fund. In the log, your future voice gives calm orders to a ship that will not hear them if you keep this course.",
      "The amber gate shrinks to an error on the glass. You could still open the channel. The recording knows your thumb.",
    ],
    choices: [
      { label: "File the recording as weather.", to: "cartographer" },
      { label: "Play it back into the channel.", to: "passenger" },
    ],
  },
  passenger: {
    id: "passenger",
    kicker: "Ending",
    title: "The Passenger",
    ending: "passenger",
    paragraphs: [
      "You sit. The chair already knew the shape of that. The difference between choosing and arriving is smaller here than the manuals suggested, and the manuals were written by people who stayed outside.",
      "The map in your lap is the one Meridian will receive three hours before its cartographer speaks. You try your voice. It leaves early. At the amber edge, a person who has your hands hears it and has not answered.",
      "You tell them not to answer. You remember, now, how much good that does.",
    ],
  },
  cartographer: {
    id: "cartographer",
    kicker: "Ending",
    title: "The Cartographer",
    ending: "cartographer",
    paragraphs: [
      "You stay outside. The well understands this and does not love it. Love was never the contract.",
      "What you carry back has one coast the institute did not pay for, and no requirement that you stand on it. Dust leaves the canopy as you clear the ring. The pencil behind your ear is only warm from your head.",
      "In the margin, in your hand, a line you do not remember writing: the well keeps only what is offered. You offered a record. You kept the name it was filed under.",
    ],
  },
  refusal: {
    id: "refusal",
    kicker: "Ending",
    title: "The Refusal",
    ending: "refusal",
    paragraphs: [
      "You decline the exchange. The lens forgets your name, which takes longer than forgetting should. For a little while the stars pronounce you. Then they misplace the syllable and move on.",
      "Meridian's starboard running light stays a fraction out of true. The engineers will blame a diode. You will let them. The survey band is ordinary quiet.",
      "If a voice arrives early someday, it will not be yours. You do not go looking for whose it is. That looking would be a second offer, and you are done offering.",
    ],
  },
};

export function endingEpitaph(ending: EndingId): string {
  switch (ending) {
    case "passenger":
      return "You became the early voice.";
    case "cartographer":
      return "You left with a true map, and yourself outside it.";
    case "refusal":
      return "You offered nothing. The well let you leave unremembered.";
    default: {
      const unreachable: never = ending;
      return unreachable;
    }
  }
}

export function endingNote(ending: EndingId, flags: readonly Flag[]): string {
  switch (ending) {
    case "passenger":
      if (flags.includes("lied")) {
        return "You walked in along a coast that began as a lie, and the chair did not distinguish.";
      }
      if (flags.includes("sent")) {
        return "The map had gone in ahead of you. Sitting was only how you caught up with it.";
      }
      if (flags.includes("dark")) {
        return "You offered your name in the dark, transmitter cold. The room treated that as a full introduction.";
      }
      if (flags.includes("recorded")) {
        return "The recording entered first. You followed your own orders in.";
      }
      if (flags.includes("honest")) {
        return "You told the truth about yourself, and the corridor shortened.";
      }
      return "You came in with the map, and the map stayed when you became the warning.";
    case "cartographer":
      if (flags.includes("sent")) {
        return "You let the corrected chart stand. A version of the voyage is clean, and you are not in it.";
      }
      if (flags.includes("dark")) {
        return "You offered the log and not the body. The well called that a fair map.";
      }
      if (flags.includes("recorded")) {
        return "You filed the voice under weather and did not play it back. The archive will outlive the hesitation.";
      }
      if (flags.includes("silent")) {
        return "You never answered. The chart is sharper for the quiet.";
      }
      return "You left the map on the chair and kept your weight outside the ring.";
    case "refusal":
      if (flags.includes("lied")) {
        return "You broke off the false coast before it grew a floor. One instrument still shows the scar.";
      }
      if (flags.includes("opposite")) {
        return "You held the heading away from the named fear. The fear stays named. You stay aboard.";
      }
      if (flags.includes("sent")) {
        return "You burned out of the corrected sky. The twelfth second closed without you.";
      }
      if (flags.includes("dark")) {
        return "You offered nothing, not even the log. The forgetting was clean.";
      }
      return "You turned for open dark and did not look back long enough to be kept.";
    default: {
      const unreachable: never = ending;
      return unreachable;
    }
  }
}
