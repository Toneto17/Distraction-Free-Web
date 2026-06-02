const DFW_RULE_VERSION = 2;

const DISTRACTION_RULES = {
  "youtube.com": {
    name: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"],
    features: [
      {
        id: "yt-redirect-subs",
        title: "Redirect Home to Subscriptions",
        group: "Navigation",
        type: "redirect",
        from: ["/"],
        to: "/feed/subscriptions"
      },
      {
        id: "yt-home-feed",
        title: "Hide Home Feed",
        group: "Feeds",
        selectors: [
          'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
          'ytd-browse[page-subtype="home"] ytd-rich-section-renderer'
        ]
      },
      {
        id: "yt-shorts",
        title: "Hide Shorts",
        group: "Short-form",
        selectors: {
          all: [
            'ytd-guide-entry-renderer:has(a[href^="/shorts/"])',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts/"])',
            'ytd-guide-entry-renderer:has(a[title="Shorts"])',
            'ytd-rich-section-renderer:has(a[href^="/shorts/"])',
            'ytd-reel-shelf-renderer:has(a[href^="/shorts/"])',
            'ytd-shelf-renderer:has(a[href^="/shorts/"])',
            'ytd-video-renderer:has(a[href^="/shorts/"])',
            'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
            'a[href^="/shorts/"]'
          ],
          mobile: [
            'ytm-pivot-bar-item-renderer:has(a[href^="/shorts"])',
            'ytm-reel-shelf-renderer'
          ]
        }
      },
      {
        id: "yt-recommendations",
        title: "Hide Side Recommendations",
        group: "Recommendations",
        selectors: [
          "#secondary-inner",
          "#related",
          "ytd-watch-next-secondary-results-renderer"
        ]
      },
      {
        id: "yt-comments",
        title: "Hide Comments",
        group: "Conversation",
        selectors: [
          "#comments",
          "ytd-comments",
          "ytm-comment-section-renderer"
        ]
      },
      {
        id: "yt-endscreens",
        title: "Hide End Screen Overlays",
        group: "Video Player",
        selectors: [
          ".ytp-endscreen-content",
          ".ytp-ce-video",
          ".ytp-cards-teaser",
          ".ytp-cards-button"
        ]
      }
    ]
  },
  "x.com": {
    name: "X (Twitter)",
    hosts: ["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
    features: [
      {
        id: "x-trending",
        title: "Hide Trending",
        group: "Recommendations",
        selectors: [
          '[aria-label="Timeline: Trending now"]',
          '[aria-label="Linea temporal: Tendencias"]',
          '[aria-label="Línea temporal: Tendencias"]',
          '[data-testid="trend"]'
        ]
      },
      {
        id: "x-who-to-follow",
        title: "Hide Who to Follow",
        group: "Recommendations",
        selectors: [
          '[aria-label="Who to follow"]',
          '[aria-label="A quien seguir"]',
          '[aria-label="A quién seguir"]',
          '[data-testid="UserCell"]:has([role="button"])'
        ]
      },
      {
        id: "x-explore-nav",
        title: "Hide Explore Navigation",
        group: "Navigation",
        selectors: [
          'a[href="/explore"]',
          'a[href="/i/trends"]'
        ]
      },
      {
        id: "x-premium-upsells",
        title: "Hide Premium Upsells",
        group: "Upsells",
        selectors: [
          '[aria-label*="Premium" i]',
          'aside [href="/i/premium_sign_up"]',
          'a[href="/i/verified-orgs-signup"]'
        ]
      }
    ]
  },
  "twitch.tv": {
    name: "Twitch",
    hosts: ["twitch.tv", "www.twitch.tv", "m.twitch.tv"],
    features: [
      {
        id: "ttv-redirect-following",
        title: "Redirect Home to Following",
        group: "Navigation",
        type: "redirect",
        from: ["/"],
        to: "/following"
      },
      {
        id: "ttv-recommended",
        title: "Hide Recommended Channels",
        group: "Recommendations",
        selectors: [
          '.side-nav-section:has([aria-label="Recommended Channels"])',
          '[aria-label="Recommended Channels"]',
          '.side-nav-section:has([aria-label="Canales recomendados"])',
          '[aria-label="Canales recomendados"]',
          '[data-a-target="side-nav-card"]:has(a[href*="/directory"])'
        ]
      },
      {
        id: "ttv-front-page",
        title: "Hide Front Page Carousel",
        group: "Feeds",
        selectors: [
          ".front-page-carousel",
          '[data-a-target="carousel-container"]',
          '[data-a-target="shelf-container"]'
        ]
      },
      {
        id: "ttv-chat",
        title: "Hide Live Chat",
        group: "Conversation",
        defaultEnabled: false,
        selectors: [
          ".chat-shell",
          '[data-a-target="chat-room"]'
        ]
      }
    ]
  },
  "linkedin.com": {
    name: "LinkedIn",
    hosts: ["linkedin.com", "www.linkedin.com"],
    features: [
      {
        id: "in-feed",
        title: "Hide News Feed",
        group: "Feeds",
        selectors: [
          "main .scaffold-finite-scroll",
          ".scaffold-layout__main .core-rail > div:first-child"
        ]
      },
      {
        id: "in-news",
        title: "Hide LinkedIn News",
        group: "Recommendations",
        selectors: [
          '[aria-label="LinkedIn News"]',
          '[aria-label="Noticias de LinkedIn"]',
          "#feed-news-module"
        ]
      },
      {
        id: "in-suggestions",
        title: "Hide Network Suggestions",
        group: "Recommendations",
        selectors: [
          ".discover-entity-type-card",
          ".entity-result:has(.artdeco-button)",
          '[data-view-name*="people" i]'
        ]
      },
      {
        id: "in-premium-upsells",
        title: "Hide Premium Upsells",
        group: "Upsells",
        selectors: [
          'a[href*="/premium/"]',
          '.premium-upsell-link',
          '[data-test-premium-upsell]'
        ]
      }
    ]
  },
  "instagram.com": {
    name: "Instagram",
    hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
    features: [
      {
        id: "ig-redirect-following",
        title: "Redirect Home to Following",
        group: "Navigation",
        type: "redirect",
        from: ["/"],
        to: "/?variant=following"
      },
      {
        id: "ig-reels",
        title: "Hide Reels",
        group: "Short-form",
        selectors: [
          'a[href*="/reels/" i]',
          'a[href="/reels/"]'
        ]
      },
      {
        id: "ig-explore",
        title: "Hide Explore Tab",
        group: "Navigation",
        selectors: [
          'a[href*="/explore/" i]',
          'a[href="/explore/"]'
        ]
      },
      {
        id: "ig-suggestions",
        title: "Hide Suggested Accounts",
        group: "Recommendations",
        selectors: [
          'section:has(a[href*="/explore/people/"])',
          'div:has(> a[href*="/explore/people/"])',
          'main [role="button"]:has(svg[aria-label*="Follow" i])'
        ]
      },
      {
        id: "ig-stories",
        title: "Hide Stories",
        group: "Feeds",
        selectors: [
          'section:has(canvas)',
          'div[role="menu"]:has(canvas)'
        ]
      }
    ]
  },
  "facebook.com": {
    name: "Facebook",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com"],
    features: [
      {
        id: "fb-reels",
        title: "Hide Reels",
        group: "Short-form",
        selectors: [
          '[aria-label*="Reels" i]',
          'a[href*="/reel/" i]',
          'div[role="region"]:has(a[href*="/reels/" i])'
        ]
      },
      {
        id: "fb-stories",
        title: "Hide Stories",
        group: "Feeds",
        selectors: [
          '[aria-label*="Stories" i]',
          '[aria-label*="Historias" i]',
          '[role="region"]:has(a[href*="/stories/" i])'
        ]
      },
      {
        id: "fb-watch",
        title: "Hide Watch",
        group: "Navigation",
        selectors: [
          'a[href*="/watch/" i]',
          '[aria-label="Watch"]'
        ]
      },
      {
        id: "fb-suggestions",
        title: "Hide Suggested Content",
        group: "Recommendations",
        selectors: [
          '[aria-label*="Suggested" i]',
          '[aria-label*="Sugerido" i]'
        ]
      }
    ]
  },
  "tiktok.com": {
    name: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com", "m.tiktok.com"],
    features: [
      {
        id: "tk-redirect-following",
        title: "Redirect Home to Following",
        group: "Navigation",
        type: "redirect",
        from: ["/", "/foryou"],
        to: "/following"
      },
      {
        id: "tk-foryou",
        title: "Hide For You Tab",
        group: "Feeds",
        selectors: [
          '[data-e2e="nav-foryou"]',
          'a[href*="/foryou" i]'
        ]
      },
      {
        id: "tk-explore",
        title: "Hide Explore Tab",
        group: "Navigation",
        selectors: [
          '[data-e2e="nav-explore"]',
          'a[href*="/explore" i]'
        ]
      },
      {
        id: "tk-live",
        title: "Hide Live",
        group: "Feeds",
        selectors: [
          '[data-e2e="nav-live"]',
          'a[href*="/live" i]'
        ]
      },
      {
        id: "tk-comments",
        title: "Hide Comments",
        group: "Conversation",
        selectors: [
          '[data-e2e="comment-list"]',
          '[data-e2e="browse-comment"]'
        ]
      }
    ]
  },
  "reddit.com": {
    name: "Reddit",
    hosts: ["reddit.com", "www.reddit.com", "new.reddit.com", "old.reddit.com", "m.reddit.com"],
    features: [
      {
        id: "rd-popular-nav",
        title: "Hide Popular and All",
        group: "Navigation",
        selectors: [
          'a[href="/r/popular/"]',
          'a[href="/r/all/"]',
          'a[href="/r/popular"]',
          'a[href="/r/all"]'
        ]
      },
      {
        id: "rd-trending",
        title: "Hide Trending Today",
        group: "Recommendations",
        selectors: [
          'shreddit-trending-list',
          '[data-testid="frontpage-sidebar"]',
          '.trending-subreddits',
          '.trending-card'
        ]
      },
      {
        id: "rd-sidebar",
        title: "Hide Right Sidebar",
        group: "Recommendations",
        selectors: [
          'aside[aria-label="Community information"]',
          '#right-sidebar-container',
          '.side'
        ]
      },
      {
        id: "rd-promoted",
        title: "Hide Promoted Posts",
        group: "Promoted",
        selectors: [
          'shreddit-ad-post',
          '[data-testid="post-container"]:has([data-testid="ad-placements"])',
          '.promotedlink'
        ]
      },
      {
        id: "rd-recommendations",
        title: "Hide Community Recommendations",
        group: "Recommendations",
        selectors: [
          'shreddit-recommendations-carousel',
          '[data-testid="community-recommendations"]',
          '[data-testid="subreddit-sidebar"]'
        ]
      }
    ]
  }
};

function dfwCleanHostname(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function dfwHostMatches(hostname, hostPattern) {
  const cleanHost = dfwCleanHostname(hostname);
  const cleanPattern = dfwCleanHostname(hostPattern);
  return cleanHost === cleanPattern || cleanHost.endsWith(`.${cleanPattern}`);
}

function dfwGetSiteEntryForHost(hostname) {
  for (const [domain, site] of Object.entries(DISTRACTION_RULES)) {
    const hosts = site.hosts || [domain];
    if (hosts.some(host => dfwHostMatches(hostname, host))) {
      return { domain, site };
    }
  }
  return null;
}

function dfwGetSiteEntry(domain) {
  const site = DISTRACTION_RULES[domain];
  return site ? { domain, site } : null;
}

function dfwGetSiteHostPatterns(domain) {
  const entry = dfwGetSiteEntry(domain);
  if (!entry) return [];
  const hosts = new Set([domain, ...(entry.site.hosts || [])]);
  const patterns = [];
  hosts.forEach((host) => {
    const cleanHost = dfwCleanHostname(host);
    patterns.push(`*://${cleanHost}/*`);
    patterns.push(`*://*.${cleanHost}/*`);
  });
  return Array.from(new Set(patterns));
}

function dfwIsFeatureEnabled(feature, preferences) {
  const defaultEnabled = feature.defaultEnabled !== false;
  return preferences[feature.id] === undefined ? defaultEnabled : preferences[feature.id] !== false;
}

function dfwGetFeatureSelectors(feature, context) {
  if (!feature.selectors) return [];
  if (Array.isArray(feature.selectors)) return feature.selectors;

  const selectors = [];
  const isMobile = Boolean(context && context.isMobile);
  if (Array.isArray(feature.selectors.all)) selectors.push(...feature.selectors.all);
  if (isMobile && Array.isArray(feature.selectors.mobile)) selectors.push(...feature.selectors.mobile);
  if (!isMobile && Array.isArray(feature.selectors.desktop)) selectors.push(...feature.selectors.desktop);
  return selectors;
}
