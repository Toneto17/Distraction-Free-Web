const DISTRACTION_RULES = {
  "youtube.com": {
    name: "YouTube",
    features: [
      {
        id: "yt-redirect-subs",
        title: "Redirect Home to Subscriptions",
        type: "redirect",
        from: ["/"],
        to: "/feed/subscriptions"
      },
      {
        id: "yt-shorts",
        title: "Hide Shorts",
        selectors: [
          'ytd-guide-entry-renderer:has(a[href^="/shorts/"])',
          'ytd-mini-guide-entry-renderer:has(a[href^="/shorts/"])',
          'ytd-guide-entry-renderer:has(a[title="Shorts"])',
          'ytd-rich-section-renderer:has(a[href^="/shorts/"])',
          'ytd-reel-shelf-renderer:has(a[href^="/shorts/"])',
          'ytd-shelf-renderer:has(a[href^="/shorts/"])',
          'ytd-video-renderer:has(a[href^="/shorts/"])',
          'ytd-rich-item-renderer:has(a[href^="/shorts/"])'
        ]
      },
      {
        id: "yt-recommendations",
        title: "Hide Side Recommendations",
        selectors: [
          '#secondary-inner',
          '#related'
        ]
      },
      {
        id: "yt-comments",
        title: "Hide Comments",
        selectors: [
          '#comments',
          'ytd-comments'
        ]
      },
      {
        id: "yt-endscreens",
        title: "Hide End Screen Overlays",
        selectors: [
          '.ytp-endscreen-content',
          '.ytp-ce-video'
        ]
      }
    ]
  },
  "x.com": {
    name: "X (Twitter)",
    features: [
      {
        id: "x-trending",
        title: "Hide Trending",
        selectors: [
          '[aria-label="Timeline: Trending now"]',
          '[aria-label="Línea temporal: Tendencias"]'
        ]
      },
      {
        id: "x-who-to-follow",
        title: "Hide Who to Follow",
        selectors: [
          '[aria-label="Who to follow"]',
          '[aria-label="A quién seguir"]'
        ]
      }
    ]
  },
  "twitch.tv": {
    name: "Twitch",
    features: [
      {
        id: "ttv-redirect-following",
        title: "Redirect Home to Following",
        type: "redirect",
        from: ["/"],
        to: "/following"
      },
      {
        id: "ttv-recommended",
        title: "Hide Recommended Channels",
        selectors: [
          '.side-nav-section:has([aria-label="Recommended Channels"])',
          '[aria-label="Recommended Channels"]',
          '.side-nav-section:has([aria-label="Canales recomendados"])',
          '[aria-label="Canales recomendados"]'
        ]
      },
      {
        id: "ttv-front-page",
        title: "Hide Front Page Carousel",
        selectors: [
          '.front-page-carousel',
          '[data-a-target="carousel-container"]',
          '[data-a-target="shelf-container"]'
        ]
      }
    ]
  },
  "linkedin.com": {
    name: "LinkedIn",
    features: [
      {
        id: "in-feed",
        title: "Hide News Feed",
        selectors: [
          'main .scaffold-finite-scroll',
          '.scaffold-layout__main .core-rail > div:first-child'
        ]
      },
      {
        id: "in-news",
        title: "Hide LinkedIn News",
        selectors: [
          '[aria-label="LinkedIn News"]',
          '[aria-label="Noticias de LinkedIn"]',
          '#feed-news-module'
        ]
      },
      {
        id: "in-suggestions",
        title: "Hide Network Suggestions",
        selectors: [
          '.discover-entity-type-card'
        ]
      }
    ]
  },
  "instagram.com": {
    name: "Instagram",
    features: [
      {
        id: "ig-redirect-following",
        title: "Redirect Home to Following",
        type: "redirect",
        from: ["/"],
        to: "/?variant=following"
      },
      {
        id: "ig-reels",
        title: "Hide Reels",
        selectors: [
          'a[href*="/reels/" i]'
        ]
      },
      {
        id: "ig-explore",
        title: "Hide Explore Tab",
        selectors: [
          'a[href*="/explore/" i]'
        ]
      }
    ]
  },
  "facebook.com": {
    name: "Facebook",
    features: [
      {
        id: "fb-reels",
        title: "Hide Reels",
        selectors: [
          '[aria-label*="Reels" i]',
          'div[role="region"]:has(a[href*="/reels/" i])'
        ]
      },
      {
        id: "fb-stories",
        title: "Hide Stories",
        selectors: [
          '[aria-label*="Stories" i]',
          '[aria-label*="Historias" i]'
        ]
      }
    ]
  },
  "tiktok.com": {
    name: "TikTok",
    features: [
      {
        id: "tk-redirect-following",
        title: "Redirect Home to Following",
        type: "redirect",
        from: ["/", "/foryou"],
        to: "/following"
      },
      {
        id: "tk-foryou",
        title: "Hide For You Tab",
        selectors: [
          '[data-e2e="nav-foryou"]',
          'a[href*="/foryou" i]'
        ]
      },
      {
        id: "tk-explore",
        title: "Hide Explore Tab",
        selectors: [
          '[data-e2e="nav-explore"]',
          'a[href*="/explore" i]'
        ]
      }
    ]
  }
};
