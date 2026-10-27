export interface Stage {
  title: string;
  action: string;
  touchpoint: string;
  pain: string;
  opportunity: string;
}

export interface Journey {
  id: string;
  title: string;
  persona: string;
  goal: string;
  stages: Stage[];
}

export const journeys: Journey[] = [
  {
    id: "download",
    title: "Journey 1: Downloading Samples",
    persona: "The Inspiration Seeker",
    goal: "Find the right sound fast, shape it to fit the beat, and get it into the DAW.",
    stages: [
      {
        title: "1) Discover",
        action: "Lands on Browse, Packs, or the homepage random pack looking for something fresh.",
        touchpoint: "Browse, Packs, Random pack",
        pain: "Overused libraries make everything sound the same.",
        opportunity: "Surface new and uncommon packs, and a random pick to break out of habits.",
      },
      {
        title: "2) Filter and Audition",
        action: "Filters by genre, instrument, key, BPM, and emotion, and previews waveforms in short bursts.",
        touchpoint: "Sample filters, waveform previews",
        pain: "Noisy or missing tags force extra clicks.",
        opportunity: "Consistent tagging at upload and fast, one-click previews.",
      },
      {
        title: "3) Shape with Audio FX",
        action: "Opens FX to change pitch and speed, add compression, reverse the sample, or hit Random to try ideas on the fly.",
        touchpoint: "FX panel, Reverse, Random",
        pain: "Rendering lag can break the flow, and it is unclear what changed.",
        opportunity: "Instant preview of the processed sound, with Reset to return to the original.",
      },
      {
        title: "4) Download",
        action: "Downloads only the samples needed, as processed WAVs named with the new key and BPM.",
        touchpoint: "Download button, file naming",
        pain: "Downloads from many packs become fragmented and messy.",
        opportunity: "Descriptive file names (key, BPM, rev) keep sessions organized.",
      },
      {
        title: "5) Use in the DAW",
        action: "Drags the sample into the DAW and chops or layers it into a track.",
        touchpoint: "Local DAW session",
        pain: "Unsure of usage rights, so legal confidence is guesswork.",
        opportunity: "Clear usage terms, since uploaders agree to the free-use sample license at signup.",
      },
      {
        title: "6) Give Back",
        action: "Likes the pack, leaves a comment, or posts the finished track on the pack's Songs page.",
        touchpoint: "Likes, Comments, Songs",
        pain: "Most users skip this step once the beat is done.",
        opportunity: "Prompt a share after download and point into the weekly challenge.",
      },
    ],
  },
  {
    id: "upload",
    title: "Journey 2: Uploading, Sharing, and Connecting",
    persona: "The Community Builder",
    goal: "Publish packs and songs, get them heard on and off the platform, and build relationships with other producers.",
    stages: [
      {
        title: "1) Sign Up and Verify",
        action: "Creates an account, agrees to the sample license, and confirms the email with the verification link.",
        touchpoint: "Sign up, license checkbox, Verify email",
        pain: "Extra steps before the first upload.",
        opportunity: "Short, clear license wording and a verify page that continues automatically.",
      },
      {
        title: "2) Build a Profile",
        action: "Adds a photo, bio, and social links so people know who made the sounds.",
        touchpoint: "Edit Profile, public profile page",
        pain: "An empty profile makes it hard to stand out.",
        opportunity: "A profile that showcases packs and links, with a Message button.",
      },
      {
        title: "3) Upload a Pack",
        action: "Uploads samples with cover art and tags such as genre, key, BPM, and emotion.",
        touchpoint: "Upload, My Packs, Edit pack",
        pain: "Tagging many files is tedious.",
        opportunity: "Fast bulk upload and the ability to edit tags afterward.",
      },
      {
        title: "4) Post a Song",
        action: "Posts a finished track made with a pack on its Songs page.",
        touchpoint: "Pack Songs page, song detail",
        pain: "Hard to know whether anyone is listening.",
        opportunity: "Likes and comments give immediate signals.",
      },
      {
        title: "5) Share Off Platform",
        action: "Shares a link to X, Facebook, or WhatsApp, or creates a video of the track to post on Instagram and TikTok with the song as the original audio.",
        touchpoint: "Share button, Create video, link previews",
        pain: "Instagram and TikTok cannot be posted to directly from a website.",
        opportunity: "Render a branded video and hand it to the phone's share sheet.",
      },
      {
        title: "6) Engage with the Community",
        action: "Replies to comments, likes other tracks, and sends direct messages to producers to collaborate.",
        touchpoint: "Comments, Likes, Messages, unread indicator",
        pain: "Conversations used to live on Discord and Instagram, away from the music.",
        opportunity: "Keep feedback and collaboration next to the music itself.",
      },
    ],
  },
  {
    id: "challenge",
    title: "Journey 3: Weekly Beat Challenge",
    persona: "Both personas",
    goal: "Get inspired by a weekly prompt and pack, submit a track, and be heard by the community.",
    stages: [
      {
        title: "1) Find the Challenge",
        action: "Sees the Weekly Challenge banner on the homepage or the Challenge link in the header.",
        touchpoint: "Homepage banner, header link",
        pain: "Easy to miss if it is not promoted.",
        opportunity: "A prominent entry point and a live countdown that creates urgency.",
      },
      {
        title: "2) Read the Prompt and Get the Pack",
        action: "Reads the week's prompt and opens the featured pack to find samples.",
        touchpoint: "Prompt card, featured pack",
        pain: "A prompt that is too vague or too narrow loses interest.",
        opportunity: "A moderator curates the name, prompt, and pack each week.",
      },
      {
        title: "3) Make the Track",
        action: "Downloads samples, shapes them with the Audio FX, and builds the beat in the DAW.",
        touchpoint: "Sample FX, Download",
        pain: "One week can feel short.",
        opportunity: "A clear countdown and a single featured pack reduce choice overload.",
      },
      {
        title: "4) Submit",
        action: "Uploads the track with a title and description before the week ends.",
        touchpoint: "Submit form",
        pain: "Uploads can fail, or the deadline passes before submitting.",
        opportunity: "Upload progress, and rules that only accept submissions during the current week.",
      },
      {
        title: "5) Listen, Share, and Connect",
        action: "Listens to other entries, shares his own off platform, and messages producers he likes.",
        touchpoint: "Submissions list, Share, Messages",
        pain: "Entries get little attention without promotion.",
        opportunity: "Sharing and direct messaging turn a contest into a community.",
      },
      {
        title: "6) Winner and Archive",
        action: "The moderator picks a winner, and every submission stays playable in the archive of past weeks.",
        touchpoint: "Winner banner, Past challenges",
        pain: "With no winner or feedback, participants wonder how they did.",
        opportunity: "A highlighted winner and a lasting archive reward participation.",
      },
    ],
  },
];

export const assumptions = [
  "Producers will use FX to reshape sounds if previews are instant.",
  "Most users prefer downloading individual sounds over full packs.",
  "Producers share finished tracks mainly on Instagram, TikTok, and X.",
  "A weekly prompt plus one featured pack gives enough structure to drive submissions.",
  "In-platform messaging can replace some Discord and Instagram conversations.",
];
