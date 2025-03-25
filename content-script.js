console.log('Chat Links and Previews starting...');

// Regex patterns for link detection
const youtubeRegex = /https?:\/\/(?:[\w-]+\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/([\w-]{11})/i;
const shortsRegex = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/i;
const twitterRegex = /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w-]+\/status\/\d+/i;
const urlRegex = /https?:\/\/[^\s]+/gi;

// Regex to detect user profile links (but not channel links)
const userProfileRegex = /https?:\/\/(?:www\.)?(?:rumble\.com\/user\/|odysee\.com\/@|pilled\.net\/user\/)[^\s]+/i;

// Regex to detect static page links we want to ignore (e.g., Rumble channel or premium links)
const staticPageLinkRegex = /https?:\/\/(?:www\.)?rumble\.com\/(c\/|premium)[^\s]*/i;

function isImageUrl(url) {
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ||
         (url.includes('imgur.com') && !url.includes('/a/')) ||
         url.includes('cdn.discordapp.com') ||
         url.match(/pbs\.twimg\.com.*format=(jpg|png|gif)/i);
}

function isVideoUrl(url) {
  return url.match(/\.(mp4|webm|ogg)$/i);
}

function isUserProfile(url) {
  const isProfile = userProfileRegex.test(url);
  if (isProfile) {
    console.log(`Skipping user profile: ${url}`);
  }
  return isProfile;
}

function isStaticPageLink(url) {
  const isStatic = staticPageLinkRegex.test(url);
  if (isStatic) {
    console.log(`Skipping static page link: ${url}`);
  }
  return isStatic;
}

function createImagePreview(url) {
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '300px';
  img.style.maxHeight = '400px';
  img.style.display = 'block';
  img.style.marginTop = '4px';
  img.style.borderRadius = '4px';
  img.onload = () => {
    requestAnimationFrame(() => {
      const chatContainer = document.getElementById('chat-history-list') || document.querySelector('.chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  };
  return img;
}

function createVideoPreview(url) {
  const video = document.createElement('video');
  video.src = url;
  video.style.maxWidth = '300px';
  video.style.maxHeight = '400px';
  video.style.display = 'block';
  video.style.marginTop = '4px';
  video.style.borderRadius = '4px';
  video.controls = true;
  video.muted = true;
  video.autoplay = true;
  video.onloadedmetadata = () => {
    requestAnimationFrame(() => {
      const chatContainer = document.getElementById('chat-history-list') || document.querySelector('.chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  };
  return video;
}

let isActive = false;
let initialLoadComplete = false; // Flag to skip initial static content

function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && isActive;
}

function storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks) {
  if (!isContextValid()) return;

  console.log('Storing links:', { youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks });

  chrome.storage.local.get({
    youtubeLinks: [], shortsLinks: [], twitterLinks: [], imageLinks: [], videoLinks: [], otherLinks: []
  }, data => {
    if (!isContextValid()) return;

    const newYoutube = [...new Set([...data.youtubeLinks, ...youtubeLinks])].slice(-250);
    const newShorts = [...new Set([...data.shortsLinks, ...shortsLinks])].slice(-250);
    const newTwitter = [...new Set([...data.twitterLinks, ...twitterLinks])].slice(-250);
    const newImages = [...new Set([...data.imageLinks, ...imageLinks])].slice(-250);
    const newVideos = [...new Set([...data.videoLinks, ...videoLinks])].slice(-250);
    const newOther = [...new Set([...data.otherLinks, ...otherLinks])].slice(-250);

    chrome.storage.local.set({
      youtubeLinks: newYoutube, shortsLinks: newShorts, twitterLinks: newTwitter,
      imageLinks: newImages, videoLinks: newVideos, otherLinks: newOther
    }, () => {
      if (chrome.runtime.lastError) console.error('Storage error:', chrome.runtime.lastError);
    });
  });
}

function watchChat() {
  const chatContainer = document.getElementById('chat-history-list') ||
                        document.getElementById('js-chat--height') ||
                        document.querySelector('.chat-history-list, .chat-container');

  if (!chatContainer) {
    console.log('Chat container not found, retrying in 1s...');
    setTimeout(watchChat, 1000);
    return;
  }

  console.log('Found chat container:', chatContainer.id || chatContainer.className);

  const observer = new MutationObserver((mutations) => {
    // Skip processing during initial load to avoid static content
    if (!initialLoadComplete) {
      console.log('Skipping mutation during initial load');
      return;
    }

    let youtubeLinks = [];
    let shortsLinks = [];
    let twitterLinks = [];
    let imageLinks = [];
    let videoLinks = [];
    let otherLinks = [];

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Check for links in <a> tags or elements with href
        const links = [...node.querySelectorAll('a, [href]')];
        links.forEach(link => {
          const url = link.href || link.getAttribute('data-url');
          if (!url || link.dataset?.processed) return;

          console.log(`Found link in <a> tag: ${url}`);

          if (isUserProfile(url) || isStaticPageLink(url)) {
            link.dataset.processed = true;
            return;
          }

          if (isImageUrl(url)) {
            link.replaceWith(createImagePreview(url));
            imageLinks.push(url);
          } else if (isVideoUrl(url)) {
            link.replaceWith(createVideoPreview(url));
            videoLinks.push(url);
          } else if (shortsRegex.test(url)) {
            shortsLinks.push(url);
          } else if (youtubeRegex.test(url)) {
            youtubeLinks.push(url);
          } else if (twitterRegex.test(url)) {
            twitterLinks.push(url);
          } else {
            otherLinks.push(url);
          }

          link.dataset.processed = true;
        });

        // Scan text content for links not wrapped in <a> tags
        const textNodes = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        while (textNode = walker.nextNode()) {
          textNodes.push(textNode);
        }

        textNodes.forEach(textNode => {
          const text = textNode.textContent || '';
          const allLinks = [...text.matchAll(urlRegex)].map(m => m[0]).filter(link => link !== window.location.href);
          allLinks.forEach(url => {
            console.log(`Found link in text: ${url}`);
            if (isUserProfile(url) || isStaticPageLink(url)) return;

            if (isImageUrl(url)) {
              if (!imageLinks.includes(url)) imageLinks.push(url);
            } else if (isVideoUrl(url)) {
              if (!videoLinks.includes(url)) videoLinks.push(url);
            } else if (shortsRegex.test(url)) {
              if (!shortsLinks.includes(url)) shortsLinks.push(url);
            } else if (youtubeRegex.test(url)) {
              if (!youtubeLinks.includes(url)) youtubeLinks.push(url);
            } else if (twitterRegex.test(url)) {
              if (!twitterLinks.includes(url)) twitterLinks.push(url);
            } else if (!otherLinks.includes(url)) {
              otherLinks.push(url);
            }
          });
        });
      });
    });

    if (youtubeLinks.length || shortsLinks.length || twitterLinks.length || imageLinks.length || videoLinks.length || otherLinks.length) {
      storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
    }
  });

  observer.observe(chatContainer, { childList: true, subtree: true });

  // Mark initial load as complete after a short delay to skip static content
  setTimeout(() => {
    console.log('Initial load complete, starting to process mutations');
    initialLoadComplete = true;
  }, 2000); // Adjust delay if needed
}

window.addEventListener('load', () => {
  console.log('Page loaded, starting watch.');
  isActive = true;
  watchChat();
});

window.addEventListener('unload', () => {
  console.log('Page unloading, stopping watch.');
  isActive = false;
});