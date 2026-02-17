/* ─────────────────────────────────────────────────────
 * InstinctFi — English / Nepali (नेपाली) translations
 * ───────────────────────────────────────────────────── */

export type Lang = "en" | "ne";

const translations = {
  /* ── Global / Navbar ── */
  polls: { en: "Polls", ne: "मतदानहरू" },
  create: { en: "Create", ne: "सिर्जना" },
  leaderboard: { en: "Leaderboard", ne: "लिडरबोर्ड" },
  activity: { en: "Activity", ne: "गतिविधि" },
  profile: { en: "Profile", ne: "प्रोफाइल" },
  admin: { en: "Admin", ne: "प्रशासन" },
  home: { en: "Home", ne: "गृहपृष्ठ" },
  feed: { en: "Feed", ne: "फिड" },

  connectPhantom: { en: "Connect Wallet", ne: "वालेट जडान गर्नुहोस्" },
  connectPhantomWallet: { en: "Connect Wallet", ne: "वालेट जडान गर्नुहोस्" },
  disconnectWallet: { en: "Disconnect wallet", ne: "वालेट विच्छेद गर्नुहोस्" },
  airdropReceived: { en: "Airdrop received!", ne: "एयरड्रप प्राप्त भयो!" },

  /* ── Hero / Home ── */
  predictVoteWin: { en: "Predict. Vote. Win.", ne: "भविष्यवाणी गर। मतदान गर। जित।" },
  heroDesc: {
    en: "Buy option-coins on prediction polls. If your side wins, you take the entire losing pool.",
    ne: "भविष्यवाणी मतदानमा अप्शन-सिक्काहरू किन्नुहोस्। तपाईंको पक्ष जित्यो भने, तपाईंले हारेको पुल लिनुहुन्छ।",
  },
  heroSignup: {
    en: "Sign up with your wallet and get <strong>devnet SOL</strong> to start trading!",
    ne: "वालेटमा साइन अप गर्नुहोस् र ट्रेडिङ सुरु गर्न <strong>devnet SOL</strong> पाउनुहोस्!",
  },
  liveOnDevnet: { en: "Live on Solana Devnet", ne: "Solana Devnet मा लाइभ" },
  nonCustodial: { en: "Non-custodial", ne: "गैर-कस्टोडियल" },
  instantSettlement: { en: "Instant settlement", ne: "तुरुन्त सेटलमेन्ट" },
  poweredBySolana: { en: "Powered by Solana", ne: "Solana द्वारा संचालित" },
  welcomeBack: { en: "Welcome Back!", ne: "स्वागतम्!" },
  balance: { en: "Balance", ne: "ब्यालेन्स" },
  browsePolls: { en: "Browse Polls", ne: "मतदानहरू हेर्नुहोस्" },
  createPoll: { en: "Create Poll", ne: "मतदान सिर्जना गर्नुहोस्" },
  createPollPlus: { en: "+ Create Poll", ne: "+ मतदान सिर्जना" },

  /* ── Trending ── */
  trending: { en: "Trending", ne: "ट्रेन्डिङ" },
  seeAll: { en: "See all", ne: "सबै हेर्नुहोस्" },
  allCategories: { en: "All Categories", ne: "सबै कोटिहरू" },

  /* ── Categories ── */
  catCrypto: { en: "Crypto", ne: "क्रिप्टो" },
  catSports: { en: "Sports", ne: "खेलकुद" },
  catPolitics: { en: "Politics", ne: "राजनीति" },
  catTech: { en: "Tech", ne: "प्रविधि" },
  catEntertainment: { en: "Entertainment", ne: "मनोरञ्जन" },
  catScience: { en: "Science", ne: "विज्ञान" },
  catEconomics: { en: "Economics", ne: "अर्थशास्त्र" },
  catCulture: { en: "Culture", ne: "संस्कृति" },
  catClimate: { en: "Climate", ne: "जलवायु" },
  catMentions: { en: "Mentions", ne: "उल्लेखहरू" },
  catCompanies: { en: "Companies", ne: "कम्पनीहरू" },
  catFinancials: { en: "Financials", ne: "वित्तीय" },
  catOther: { en: "Other", ne: "अन्य" },
  catAll: { en: "All", ne: "सबै" },

  /* ── How It Works ── */
  howItWorks: { en: "How It Works", ne: "यसरी काम गर्छ" },
  step1Title: { en: "Create a Poll", ne: "मतदान सिर्जना गर्नुहोस्" },
  step1Desc: {
    en: "Set options, price per coin, and seed the pool with your investment.",
    ne: "विकल्पहरू, प्रति सिक्का मूल्य सेट गर्नुहोस्, र आफ्नो लगानीले पुल सिड गर्नुहोस्।",
  },
  step2Title: { en: "Buy Option-Coins", ne: "अप्शन-सिक्काहरू किन्नुहोस्" },
  step2Desc: {
    en: "Each coin = 1 vote. Pick the option you think will win.",
    ne: "प्रत्येक सिक्का = १ मत। तपाईंलाई जित्ने लाग्ने विकल्प छान्नुहोस्।",
  },
  step3Title: { en: "Poll Settles", ne: "मतदान सेटल हुन्छ" },
  step3Desc: {
    en: "After end time, the winning option is determined by most votes.",
    ne: "अन्त्य समय पछि, सबैभन्दा बढी मतले विजेता विकल्प निर्धारण गर्छ।",
  },
  step4Title: { en: "Winners Collect", ne: "विजेताले सङ्कलन गर्छ" },
  step4Desc: {
    en: "Winning voters split the ENTIRE pool proportionally.",
    ne: "विजेता मतदाताहरूले सम्पूर्ण पुल आनुपातिक रूपमा बाँड्छन्।",
  },

  /* ── Polls page ── */
  searchPlaceholder: {
    en: "Search polls by title or description...",
    ne: "शीर्षक वा विवरण द्वारा मतदान खोज्नुहोस्...",
  },
  noPollsFound: { en: "No polls found", ne: "कुनै मतदान भेटिएन" },
  noPollsHint: {
    en: "Try adjusting your filters or create a new poll.",
    ne: "फिल्टरहरू समायोजन गर्नुहोस् वा नयाँ मतदान सिर्जना गर्नुहोस्।",
  },
  createFirstPoll: { en: "Create the first poll", ne: "पहिलो मतदान सिर्जना गर्नुहोस्" },
  all: { en: "All", ne: "सबै" },
  active: { en: "Active", ne: "सक्रिय" },
  settled: { en: "Settled", ne: "सेटल" },
  mostVoted: { en: "Most Voted", ne: "सबैभन्दा बढी मत" },
  latest: { en: "Latest", ne: "नवीनतम" },
  oldest: { en: "Oldest", ne: "सबैभन्दा पुरानो" },
  prev: { en: "Prev", ne: "अघिल्लो" },
  next: { en: "Next", ne: "अर्को" },
  previousPage: { en: "Previous page", ne: "अघिल्लो पृष्ठ" },
  nextPage: { en: "Next page", ne: "अर्को पृष्ठ" },
  clearSearch: { en: "Clear search", ne: "खोज हटाउनुहोस्" },

  /* ── Create page ── */
  createAPoll: { en: "Create a Poll", ne: "मतदान सिर्जना गर्नुहोस्" },
  createPollSubtitle: {
    en: "Set up a prediction market for others to vote on.",
    ne: "अरूले मतदान गर्न भविष्यवाणी बजार सेटअप गर्नुहोस्।",
  },
  pollImage: { en: "Poll Image", ne: "मतदान तस्बिर" },
  optional: { en: "(optional)", ne: "(ऐच्छिक)" },
  pollTitle: { en: "Poll Title", ne: "मतदान शीर्षक" },
  description: { en: "Description", ne: "विवरण" },
  category: { en: "Category", ne: "कोटि" },
  options: { en: "Options", ne: "विकल्पहरू" },
  addOption: { en: "Add Option", ne: "विकल्प थप्नुहोस्" },
  addAvatar: { en: "Add avatar", ne: "अवतार थप्नुहोस्" },
  unitPrice: { en: "Unit Price (SOL)", ne: "एकाइ मूल्य (SOL)" },
  duration: { en: "Duration (hours)", ne: "अवधि (घण्टा)" },
  creatorInvestment: { en: "Creator Investment (SOL)", ne: "सिर्जनाकर्ता लगानी (SOL)" },
  tokenomicsPreview: { en: "Tokenomics Preview", ne: "टोकनोमिक्स पूर्वावलोकन" },
  poolSeed: { en: "Pool Seed:", ne: "पुल सिड:" },
  platformFee: { en: "Platform Fee (1%):", ne: "प्लेटफर्म शुल्क (१%):" },
  creatorReward: { en: "Creator Reward (1%):", ne: "सिर्जनाकर्ता पुरस्कार (१%):" },
  totalInvestment: { en: "Total Investment:", ne: "कुल लगानी:" },
  yourBalance: { en: "Your balance:", ne: "तपाईंको ब्यालेन्स:" },
  creatingPoll: { en: "Creating Poll...", ne: "मतदान सिर्जना हुदैछ..." },
  uploadingImages: { en: "Uploading Images...", ne: "तस्बिरहरू अपलोड हुदैछ..." },
  quickStart: { en: "Quick start with a template:", ne: "टेम्प्लेटबाट छिटो सुरु:" },
  connectWalletToCreate: {
    en: "Connect your wallet to create polls",
    ne: "मतदान सिर्जना गर्न वालेट जडान गर्नुहोस्",
  },

  /* ── Create page validation ── */
  titleRequired: { en: "Title is required", ne: "शीर्षक आवश्यक छ" },
  allOptionsMustHaveLabels: { en: "All options must have labels", ne: "सबै विकल्पहरूमा लेबल हुनुपर्छ" },
  invalidUnitPrice: { en: "Invalid unit price", ne: "अमान्य एकाइ मूल्य" },
  invalidInvestment: { en: "Invalid investment", ne: "अमान्य लगानी" },
  insufficientBalance: { en: "Insufficient SOL balance", ne: "अपर्याप्त SOL ब्यालेन्स" },
  investmentMinPrice: { en: "Investment must be >= unit price", ne: "लगानी >= एकाइ मूल्य हुनुपर्छ" },
  imageUploadFailed: { en: "Image upload failed", ne: "तस्बिर अपलोड असफल" },
  createPollFailed: { en: "Failed to create poll — check your balance", ne: "मतदान सिर्जना असफल — ब्यालेन्स जाँच गर्नुहोस्" },
  templateApplied: { en: "Template applied — edit the fields!", ne: "टेम्प्लेट लागू भयो — फिल्डहरू सम्पादन गर्नुहोस्!" },

  /* ── Leaderboard page ── */
  thisWeek: { en: "This Week", ne: "यो हप्ता" },
  thisMonth: { en: "This Month", ne: "यो महिना" },
  allTime: { en: "All Time", ne: "सबै समय" },
  profit: { en: "Profit", ne: "नाफा" },
  wins: { en: "Wins", ne: "जित" },
  votes: { en: "Votes", ne: "मतहरू" },
  creatorDollar: { en: "Creator $", ne: "सिर्जनाकर्ता $" },
  user: { en: "User", ne: "प्रयोगकर्ता" },
  netProfit: { en: "Net Profit", ne: "शुद्ध नाफा" },
  winPercent: { en: "Win %", ne: "जित %" },
  pollsWon: { en: "Polls Won", ne: "जितिएका मतदानहरू" },
  noUsersYet: { en: "No users yet", ne: "अहिलेसम्म कुनै प्रयोगकर्ता छैन" },
  leaderboardHint: {
    en: "Create & vote on polls to appear on the leaderboard!",
    ne: "लिडरबोर्डमा देखिन मतदान सिर्जना र मत गर्नुहोस्!",
  },

  /* ── Activity page ── */
  activityFeed: { en: "Activity Feed", ne: "गतिविधि फिड" },
  recentActivity: { en: "Recent activity across all polls", ne: "सबै मतदानहरूको हालको गतिविधि" },
  created: { en: "Created", ne: "सिर्जना गरिएको" },
  voted: { en: "Voted", ne: "मतदान गरिएको" },
  ended: { en: "Ended", ne: "समाप्त" },
  myActivity: { en: "My Activity", ne: "मेरो गतिविधि" },
  everyone: { en: "Everyone", ne: "सबैजना" },
  noActivityYet: { en: "No activity yet", ne: "अहिलेसम्म कुनै गतिविधि छैन" },
  loadMore: { en: "Load More", ne: "थप लोड गर्नुहोस्" },
  justNow: { en: "Just now", ne: "भर्खरै" },

  /* ── Profile page ── */
  editProfile: { en: "Edit Profile", ne: "प्रोफाइल सम्पादन" },
  inviteFriends: { en: "Invite Friends", ne: "साथीहरूलाई निम्तो" },
  watchlist: { en: "Watchlist", ne: "वाचलिस्ट" },
  myCreatedPolls: { en: "My Created Polls", ne: "मेरा सिर्जित मतदानहरू" },
  creatorDashboard: { en: "Creator Dashboard", ne: "सिर्जनाकर्ता ड्यासबोर्ड" },
  perPollBreakdown: { en: "Per-Poll Breakdown", ne: "प्रति-मतदान विश्लेषण" },
  myVoteHistory: { en: "My Vote History", ne: "मेरो मतदान इतिहास" },
  recentReferrals: { en: "Recent Referrals", ne: "हालका रेफरलहरू" },
  dailyReward: { en: "Daily Reward", ne: "दैनिक पुरस्कार" },
  connectWalletToView: {
    en: "Connect your wallet to view your profile",
    ne: "प्रोफाइल हेर्न वालेट जडान गर्नुहोस्",
  },
  cancel: { en: "Cancel", ne: "रद्द" },
  save: { en: "Save", ne: "सेभ" },
  saving: { en: "Saving...", ne: "सेभ हुदैछ..." },
  copy: { en: "Copy", ne: "कपि" },
  claimOneSol: { en: "Claim 1 SOL", ne: "१ SOL दाबी गर्नुहोस्" },
  claimed: { en: "Claimed!", ne: "दाबी गरियो!" },
  uploadAvatar: { en: "Upload avatar", ne: "अवतार अपलोड गर्नुहोस्" },
  displayName: { en: "Display Name", ne: "प्रदर्शन नाम" },
  enterDisplayName: { en: "Enter a display name...", ne: "प्रदर्शन नाम लेख्नुहोस्..." },
  profilePicture: { en: "Profile Picture", ne: "प्रोफाइल तस्बिर" },
  pollsCreated: { en: "Polls Created", ne: "सिर्जित मतदानहरू" },
  pollsVoted: { en: "Polls Voted", ne: "मतदान गरिएका" },
  totalVotes: { en: "Total Votes", ne: "कुल मतहरू" },
  totalSpent: { en: "Total Spent", ne: "कुल खर्च" },
  totalWon: { en: "Total Won", ne: "कुल जित" },
  creatorEarnings: { en: "Creator Earnings", ne: "सिर्जनाकर्ता आम्दानी" },
  friendsInvited: { en: "Friends Invited", ne: "निम्त्याइएका साथीहरू" },
  referredBy: { en: "Referred By", ne: "रेफर गर्ने" },
  yourReferralLink: { en: "Your Referral Link", ne: "तपाईंको रेफरल लिंक" },
  connectWalletGetLink: { en: "Connect wallet to get link", ne: "लिंक पाउन वालेट जडान गर्नुहोस्" },
  welcomeBonusClaimed: { en: "Welcome Bonus Claimed", ne: "स्वागत बोनस दाबी भयो" },
  onChainActive: { en: "On-chain account active", ne: "अन-चेन खाता सक्रिय" },
  noPollsCreatedYet: { en: "No polls created yet.", ne: "अहिलेसम्म कुनै मतदान सिर्जना भएको छैन।" },
  noVotesCastYet: { en: "No votes cast yet.", ne: "अहिलेसम्म कुनै मत दिइएको छैन।" },
  claimEvery24h: { en: "Claim 1 SOL every 24 hours", ne: "हरेक २४ घण्टामा १ SOL दाबी गर्नुहोस्" },
  lastClaimed: { en: "Last claimed", ne: "अन्तिम दाबी" },
  readyNow: { en: "Ready now!", ne: "तयार छ!" },
  remaining: { en: "remaining", ne: "बाँकी" },
  referralCopied: { en: "Referral link copied!", ne: "रेफरल लिंक कपि भयो!" },
  profileUpdated: { en: "Profile updated!", ne: "प्रोफाइल अपडेट भयो!" },
  failedToSaveProfile: { en: "Failed to save profile", ne: "प्रोफाइल सेभ गर्न असफल" },
  avatarUploadFailed: { en: "Avatar upload failed", ne: "अवतार अपलोड असफल" },
  creatorRevenue: { en: "Creator Revenue", ne: "सिर्जनाकर्ता राजस्व" },
  totalVolume: { en: "Total Volume", ne: "कुल भोल्युम" },

  /* ── PollCard component ── */
  settledBadge: { en: "✓ Settled", ne: "✓ सेटल" },
  endedBadge: { en: "Ended", ne: "समाप्त" },
  buyingCoinsOn: { en: "Buying coins on", ne: "सिक्काहरू किन्दै" },
  coins: { en: "Coins", ne: "सिक्काहरू" },
  bal: { en: "Bal:", ne: "ब्या:" },
  totalCost: { en: "Total Cost", ne: "कुल लागत" },
  buyCoins: { en: "Buy", ne: "किन्नुहोस्" },
  coin: { en: "Coin", ne: "सिक्का" },
  success: { en: "✓ Success!", ne: "✓ सफल!" },
  processing: { en: "Processing...", ne: "प्रशोधन हुदैछ..." },
  vote: { en: "Vote", ne: "मत" },
  edit: { en: "Edit", ne: "सम्पादन" },
  delete: { en: "Delete", ne: "मेटाउनु" },
  settlePoll: { en: "Settle Poll", ne: "मतदान सेटल गर्नुहोस्" },
  confirmSettle: { en: "Confirm Settle", ne: "सेटल पुष्टि गर्नुहोस्" },
  readyToSettle: { en: "Ready to Settle", ne: "सेटल गर्न तयार" },
  settleDesc: {
    en: "As admin, you can trigger settlement. Most votes wins.",
    ne: "एडमिनको रूपमा, तपाईं सेटलमेन्ट ट्रिगर गर्न सक्नुहुन्छ। सबैभन्दा बढी मतले जित्छ।",
  },
  settleConfirm: {
    en: "Are you sure? This action is irreversible.",
    ne: "तपाईं निश्चित हुनुहुन्छ? यो कार्य उल्टाउन सकिँदैन।",
  },
  youWon: { en: "You Won!", ne: "तपाईं जित्नुभयो!" },
  reward: { en: "Reward:", ne: "पुरस्कार:" },
  claimReward: { en: "Claim Reward", ne: "पुरस्कार दाबी गर्नुहोस्" },
  rewardClaimed: { en: "Reward claimed for this poll ✓", ne: "यो मतदानको पुरस्कार दाबी भयो ✓" },
  manageEditable: { en: "Manage Poll (0 votes — editable)", ne: "मतदान व्यवस्थापन (० मत — सम्पादन योग्य)" },
  cannotEditHasVotes: { en: "Cannot edit/delete — poll has votes", ne: "सम्पादन/मेटाउन सकिँदैन — मतदानमा मतहरू छन्" },
  youCreated: { en: "You created this poll", ne: "तपाईंले यो मतदान सिर्जना गर्नुभयो" },
  yourPositions: { en: "Your positions", ne: "तपाईंका स्थानहरू" },
  removeBookmark: { en: "Remove bookmark", ne: "बुकमार्क हटाउनुहोस्" },
  bookmark: { en: "Bookmark", ne: "बुकमार्क" },
  pollSettled: { en: "Poll settled!", ne: "मतदान सेटल भयो!" },
  settlementFailed: { en: "Settlement failed", ne: "सेटलमेन्ट असफल" },
  noRewardToClaim: { en: "No reward to claim", ne: "दाबी गर्ने पुरस्कार छैन" },
  perCoin: { en: "/coin", ne: "/सिक्का" },

  /* ── PollComments ── */
  discussion: { en: "Discussion", ne: "छलफल" },
  shareThoughts: { en: "Share your thoughts...", ne: "आफ्ना विचारहरू साझा गर्नुहोस्..." },
  connectWalletToComment: { en: "Connect wallet to comment", ne: "टिप्पणी गर्न वालेट जडान गर्नुहोस्" },
  post: { en: "Post", ne: "पोस्ट" },
  noCommentsYet: {
    en: "No comments yet. Be the first to share your thoughts!",
    ne: "अहिलेसम्म कुनै टिप्पणी छैन। पहिलो विचार साझा गर्नुहोस्!",
  },
  commentTooLong: { en: "Comment too long (max 500 chars)", ne: "टिप्पणी धेरै लामो छ (अधिकतम ५०० अक्षर)" },
  failedToPostComment: { en: "Failed to post comment", ne: "टिप्पणी पोस्ट गर्न असफल" },

  /* ── ShareButton ── */
  share: { en: "Share", ne: "साझा" },
  copyLink: { en: "Copy Link", ne: "लिंक कपि" },
  shareOnX: { en: "Share on X", ne: "X मा साझा गर्नुहोस्" },
  copyEmbedCode: { en: "Copy Embed Code", ne: "एम्बेड कोड कपि" },
  sharePoll: { en: "Share poll", ne: "मतदान साझा गर्नुहोस्" },
  linkCopied: { en: "Link copied!", ne: "लिंक कपि भयो!" },
  embedCopied: { en: "Embed code copied!", ne: "एम्बेड कोड कपि भयो!" },
  failedToCopy: { en: "Failed to copy", ne: "कपि गर्न असफल" },

  /* ── VoteChart ── */
  voteDistribution: { en: "Vote Distribution", ne: "मत वितरण" },
  totalVotesLabel: { en: "total votes", ne: "कुल मतहरू" },
  votesLabel: { en: "votes", ne: "मतहरू" },

  /* ── WalletConnectModal ── */
  connectYourWallet: { en: "Connect Your Wallet", ne: "वालेट जडान गर्नुहोस्" },
  walletModalDesc: {
    en: "Connect your wallet to start predicting and earn rewards.",
    ne: "भविष्यवाणी सुरु गर्न र पुरस्कार कमाउन वालेट जडान गर्नुहोस्।",
  },
  onChainSetup: { en: "On-Chain Account Setup", ne: "अन-चेन खाता सेटअप" },
  onChainSetupDesc: {
    en: "Create your Solana account and start predicting with real SOL!",
    ne: "Solana खाता सिर्जना गर्नुहोस् र वास्तविक SOL ले भविष्यवाणी सुरु गर्नुहोस्!",
  },
  devnetAirdrop: { en: "Devnet SOL airdrop", ne: "Devnet SOL एयरड्रप" },
  leaderboardRankings: { en: "Leaderboard rankings", ne: "लिडरबोर्ड र्याङ्किङ" },
  createOwnPolls: { en: "Create your own polls", ne: "आफ्नो मतदान सिर्जना गर्नुहोस्" },
  winFromPool: { en: "Win from the pool", ne: "पुलबाट जित्नुहोस्" },
  close: { en: "Close", ne: "बन्द" },

  /* ── Poll detail ── */
  backToPolls: { en: "Back to Polls", ne: "मतदानहरूमा फर्कनुहोस्" },
  pollNotFound: { en: "Poll not found", ne: "मतदान भेटिएन" },
  loadingPoll: { en: "Loading poll...", ne: "मतदान लोड हुदैछ..." },
  connectWalletToStart: { en: "Connect Wallet to Start", ne: "सुरु गर्न वालेट जडान गर्नुहोस्" },

  /* ── Empty states ── */
  noPollsYet: { en: "No polls yet", ne: "अहिलेसम्म कुनै मतदान छैन" },
  beFirstToCreate: {
    en: "Be the first to create a prediction market!",
    ne: "भविष्यवाणी बजार सिर्जना गर्ने पहिलो बन्नुहोस्!",
  },

  /* ── Language toggle ── */
  switchToNepali: { en: "नेपाली", ne: "नेपाली" },
  switchToEnglish: { en: "English", ne: "English" },
} as const;

export type TranslationKey = keyof typeof translations;

/** Return the string for a given key in the given language */
export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

/** Map a raw category label (e.g. "Crypto") to its translation key */
const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  Trending: "trending",
  Crypto: "catCrypto",
  Sports: "catSports",
  Politics: "catPolitics",
  Tech: "catTech",
  Entertainment: "catEntertainment",
  Science: "catScience",
  Economics: "catEconomics",
  Culture: "catCulture",
  Climate: "catClimate",
  Mentions: "catMentions",
  Companies: "catCompanies",
  Financials: "catFinancials",
  Other: "catOther",
  All: "catAll",
};

/** Translate a category label */
export function tCat(label: string, lang: Lang): string {
  const key = CATEGORY_KEY_MAP[label];
  return key ? t(key, lang) : label;
}

export default translations;
