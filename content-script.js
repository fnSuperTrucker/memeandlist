console.log('Chat Links and Previews starting...');

// Regex patterns for link detection
const youtubeRegex = /https?:\/\/(?:[\w-]+\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/([\w-]{11})/i;
const shortsRegex = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/i;
const twitterRegex = /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w-]+\/status\/\d+/i;
const urlRegex = /https?:\/\/[^\s]+/gi;

// Regex to detect user profile links (but not channel links)
const userProfileRegex = /https?:\/\/(?:www\.)?(?:rumble\.com\/user\/|odysee\.com\/@|pilled\.net\/user\/)[^\s]+/i;

// Regex to detect static page links we want to ignore
const staticPageLinkRegex = /https?:\/\/(?:www\.)?(?:rumble\.com\/(c\/|premium)|pilled\.net\/(profile|login|signup))[^\s]*/i;

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
  if (isProfile) console.log(`Skipping user profile: ${url}`);
  return isProfile;
}

function isStaticPageLink(url) {
  const isStatic = staticPageLinkRegex.test(url);
  if (isStatic) console.log(`Skipping static page link: ${url}`);
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
    console.log('Image preview loaded:', url);
    scrollChatToBottom();
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
    console.log('Video preview loaded:', url);
    scrollChatToBottom();
  };
  return video;
}

function scrollChatToBottom() {
  setTimeout(() => {
    // Try specific selectors for Rumble's chat container
    let chatContainer = document.querySelector(
      '#chat-history-list, #js-chat--height, .chat-history-list, .chat-container, #chat-messages, [class*="chat"], [class*="messages"]'
    );

    // If not found, try to find a scrollable parent of the preview
    if (!chatContainer) {
      const previews = document.querySelectorAll('img[src], video[src]');
      if (previews.length > 0) {
        let parent = previews[previews.length - 1].parentElement;
        while (parent && parent !== document.body) {
          if (parent.scrollHeight > parent.clientHeight) {
            chatContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
    }

    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
      console.log('Scrolled chat to bottom:', chatContainer.tagName, chatContainer.id || chatContainer.className);
    } else {
      console.log('Chat container for scrolling not found - tried specific selectors and parent traversal');
    }
  }, 100); // Slight delay to ensure DOM updates
}

let isActive = false;
let initialLoadComplete = false;

function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && isActive;
}

function storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks) {
  if (!isContextValid()) {
    console.log('Context invalid, skipping storage');
    return;
  }

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
      else console.log('Links stored successfully');
    });
  });
}

function watchChat() {
  const target = document.body;

  console.log('Observing chat on:', target.tagName);

  const observer = new MutationObserver((mutations) => {
    if (!initialLoadComplete) {
      console.log('Skipping mutation during initial load');
      return;
    }

    console.log('Mutation detected, processing', mutations.length, 'changes');

    let youtubeLinks = [];
    let shortsLinks = [];
    let twitterLinks = [];
    let imageLinks = [];
    let videoLinks = [];
    let otherLinks = [];

    const isPilledChat = window.location.hostname.includes('pilled.net');
    console.log(`Is Pilled.net chat: ${isPilledChat}`);

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const spans = node.matches('span.ng-star-inserted, span.chat-message') 
          ? [node] 
          : [...node.querySelectorAll('span.ng-star-inserted, span.chat-message')];

        spans.forEach(span => {
          if (span.dataset?.processed) return;

          const text = span.textContent || '';
          const allLinks = [...text.matchAll(urlRegex)].map(m => m[0]).filter(link => link !== window.location.href);

          if (allLinks.length > 0) {
            console.log(`Found ${allLinks.length} links in span:`, allLinks);
          }

          allLinks.forEach(url => {
            if (isUserProfile(url) || isStaticPageLink(url)) return;

            if (isPilledChat) {
              categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
            } else {
              if (isImageUrl(url) && !span.querySelector('img')) {
                const preview = createImagePreview(url);
                span.appendChild(preview);
                imageLinks.push(url);
              } else if (isVideoUrl(url) && !span.querySelector('video')) {
                const preview = createVideoPreview(url);
                span.appendChild(preview);
                videoLinks.push(url);
              } else {
                categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
              }
            }
          });

          span.dataset.processed = true;
        });

        const links = [...node.querySelectorAll('a[href], [href]')];
        links.forEach(link => {
          const url = link.href || link.getAttribute('href');
          if (!url || link.dataset?.processed) return;

          console.log(`Found link in <a> tag: ${url}`);

          if (isUserProfile(url) || isStaticPageLink(url)) {
            link.dataset.processed = true;
            return;
          }

          if (isPilledChat) {
            categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
          } else {
            if (isImageUrl(url)) {
              link.replaceWith(createImagePreview(url));
              imageLinks.push(url);
            } else if (isVideoUrl(url)) {
              link.replaceWith(createVideoPreview(url));
              videoLinks.push(url);
            } else {
              categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
            }
          }

          link.dataset.processed = true;
        });
      });
    });

    if (youtubeLinks.length || shortsLinks.length || twitterLinks.length || imageLinks.length || videoLinks.length || otherLinks.length) {
      console.log('Collected links:', { youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks });
      storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
    } else {
      console.log('No new links found in this mutation');
    }
  });

  observer.observe(target, { childList: true, subtree: true });
  console.log('MutationObserver started on body');

  setTimeout(() => {
    console.log('Initial load complete, starting to process mutations');
    initialLoadComplete = true;
    processInitialChat();
  }, 2000);
}

function processInitialChat() {
  const spans = document.querySelectorAll('span.ng-star-inserted:not([data-processed]), span.chat-message:not([data-processed])');
  console.log('Processing initial', spans.length, 'spans');

  let youtubeLinks = [];
  let shortsLinks = [];
  let twitterLinks = [];
  let imageLinks = [];
  let videoLinks = [];
  let otherLinks = [];

  const isPilledChat = window.location.hostname.includes('pilled.net');

  spans.forEach(span => {
    const text = span.textContent || '';
    const allLinks = [...text.matchAll(urlRegex)].map(m => m[0]).filter(link => link !== window.location.href);

    allLinks.forEach(url => {
      if (isUserProfile(url) || isStaticPageLink(url)) return;

      if (isPilledChat) {
        categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
      } else {
        if (isImageUrl(url) && !span.querySelector('img')) {
          const preview = createImagePreview(url);
          span.appendChild(preview);
          imageLinks.push(url);
        } else if (isVideoUrl(url) && !span.querySelector('video')) {
          const preview = createVideoPreview(url);
          span.appendChild(preview);
          videoLinks.push(url);
        } else {
          categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
        }
      }
    });

    span.dataset.processed = true;
  });

  if (youtubeLinks.length || shortsLinks.length || twitterLinks.length || imageLinks.length || videoLinks.length || otherLinks.length) {
    storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
  }
}

function categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks) {
  if (shortsRegex.test(url) && !shortsLinks.includes(url)) shortsLinks.push(url);
  else if (youtubeRegex.test(url) && !youtubeLinks.includes(url)) youtubeLinks.push(url);
  else if (twitterRegex.test(url) && !twitterLinks.includes(url)) twitterLinks.push(url);
  else if (isImageUrl(url) && !imageLinks.includes(url)) imageLinks.push(url);
  else if (isVideoUrl(url) && !videoLinks.includes(url)) videoLinks.push(url);
  else if (!otherLinks.includes(url)) otherLinks.push(url);
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