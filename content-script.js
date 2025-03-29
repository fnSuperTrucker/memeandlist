console.log('Chat Links and Previews starting...');

// Regex patterns for link detection
const youtubeRegex = /https?:\/\/(?:[\w-]+\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/([\w-]{11})/i;
const shortsRegex = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/i;
const twitterRegex = /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w-]+\/status\/\d+/i;
const urlRegex = /https?:\/\/[^\s]+/gi;

// Regex to detect user profile links (Rumble only)
const userProfileRegex = /https?:\/\/(?:www\.)?rumble\.com\/user\/[^\s]+/i;

// Regex to detect static page links we want to ignore (Rumble only)
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
  if (isProfile) console.log(`Skipping user profile: ${url}`);
  return isProfile;
}

function isStaticPageLink(url) {
  const isStatic = staticPageLinkRegex.test(url);
  if (isStatic) console.log(`Skipping static page link: ${url}`);
  return isStatic;
}

function scrollToBottom() {
  setTimeout(() => {
    const chatContainer = document.getElementById('chat-history-list');
    if (chatContainer) {
      console.log('Chat container found, scrolling to bottom. Height:', chatContainer.scrollHeight);
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      console.log('Chat container (#chat-history-list) not found for scrolling');
    }
  }, 500);
}

function createImagePreview(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank'; // Opens in a new tab
  a.style.display = 'block'; // Ensures the link takes up the full space

  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '300px';
  img.style.maxHeight = '400px';
  img.style.display = 'block';
  img.style.marginTop = '4px';
  img.style.borderRadius = '4px';
  
  img.onload = () => {
    console.log('Image preview loaded:', url);
    scrollToBottom();
  };
  
  img.onerror = () => {
    console.log('Image failed to load:', url);
    scrollToBottom();
  };
  
  a.appendChild(img); // Wrap the image in the clickable link
  return a; // Return the <a> element instead of just the <img>
}

function createVideoPreview(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank'; // Opens in a new tab
  a.style.display = 'block'; // Ensures the link takes up the full space

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
    scrollToBottom();
  };
  
  video.onerror = () => {
    console.log('Video failed to load:', url);
    scrollToBottom();
  };
  
  a.appendChild(video); // Wrap the video in the clickable link
  return a; // Return the <a> element instead of just the <video>
}

let isActive = false;
let initialLoadComplete = false;

function isContextValid() {
  const valid = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && isActive;
  console.log('Context valid:', valid);
  return valid;
}

function storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks) {
  if (!isContextValid()) {
    console.log('Context invalid, skipping storage');
    return;
  }

  console.log('Attempting to store links:', { youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks });

  chrome.storage.local.get({
    youtubeLinks: [], shortsLinks: [], twitterLinks: [], imageLinks: [], videoLinks: [], otherLinks: []
  }, data => {
    if (!isContextValid()) {
      console.log('Context became invalid during storage retrieval');
      return;
    }

    const newYoutube = [...new Set([...data.youtubeLinks, ...youtubeLinks])].slice(-250);
    const newShorts = [...new Set([...data.shortsLinks, ...shortsLinks])].slice(-250);
    const newTwitter = [...new Set([...data.twitterLinks, ...twitterLinks])].slice(-250);
    const newImages = [...new Set([...data.imageLinks, ...imageLinks])].slice(-250);
    const newVideos = [...new Set([...data.videoLinks, ...videoLinks])].slice(-250);
    const newOther = [...new Set([...data.otherLinks, ...otherLinks])].slice(-250);

    console.log('New link arrays to store:', { newYoutube, newShorts, newTwitter, newImages, newVideos, newOther });

    chrome.storage.local.set({
      youtubeLinks: newYoutube, shortsLinks: newShorts, twitterLinks: newTwitter,
      imageLinks: newImages, videoLinks: newVideos, otherLinks: newOther
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
      } else {
        console.log('Links stored successfully:', { newYoutube, newShorts, newTwitter, newImages, newVideos, newOther });
      }
    });
  });
}

function watchChat() {
  const target = document.getElementById('chat-history-list');

  if (!target) {
    console.log('Chat container not found yet, retrying in 1 second...');
    setTimeout(watchChat, 1000);
    return;
  }

  console.log('Found chat container, starting to watch for links...');

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

    mutations.forEach((mutation) => {
      console.log('Processing mutation:', mutation);
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          console.log('Skipping non-element node:', node);
          return;
        }

        const spans = node.matches('span.ng-star-inserted, span.chat-message') 
          ? [node] 
          : [...node.querySelectorAll('span.ng-star-inserted, span.chat-message')];

        console.log('Found', spans.length, 'spans in mutation');

        spans.forEach(span => {
          if (span.dataset?.processed) {
            console.log('Span already processed, skipping:', span.textContent);
            return;
          }

          const text = span.textContent || '';
          const allLinks = [...text.matchAll(urlRegex)].map(m => m[0]).filter(link => link !== window.location.href);

          if (allLinks.length > 0) {
            console.log(`Found ${allLinks.length} links in span:`, allLinks);
          } else {
            console.log('No links found in span:', text);
          }

          allLinks.forEach(url => {
            if (isUserProfile(url) || isStaticPageLink(url)) return;

            if (isImageUrl(url) && !span.querySelector('img')) {
              const preview = createImagePreview(url);
              console.log('Appending image preview to chat:', url);
              span.appendChild(preview);
              imageLinks.push(url);
            } else if (isVideoUrl(url) && !span.querySelector('video')) {
              const preview = createVideoPreview(url);
              console.log('Appending video preview to chat:', url);
              span.appendChild(preview);
              videoLinks.push(url);
            } else {
              categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
            }
          });

          span.dataset.processed = true;
        });

        const links = [...node.querySelectorAll('a[href], [href]')];
        console.log('Found', links.length, 'existing <a> tags in mutation');
        links.forEach(link => {
          const url = link.href || link.getAttribute('href');
          if (!url || link.dataset?.processed) {
            console.log('Skipping processed or invalid <a> tag:', url);
            return;
          }

          console.log(`Found link in <a> tag: ${url}`);

          if (isUserProfile(url) || isStaticPageLink(url)) {
            link.dataset.processed = true;
            return;
          }

          if (isImageUrl(url)) {
            const preview = createImagePreview(url);
            console.log('Replacing link with image preview:', url);
            link.replaceWith(preview);
            imageLinks.push(url);
          } else if (isVideoUrl(url)) {
            const preview = createVideoPreview(url);
            console.log('Replacing link with video preview:', url);
            link.replaceWith(preview);
            videoLinks.push(url);
          } else {
            categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
          }

          link.dataset.processed = true;
        });
      });
    });

    if (youtubeLinks.length || shortsLinks.length || twitterLinks.length || imageLinks.length || videoLinks.length || otherLinks.length) {
      console.log('Collected links to store:', { youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks });
      storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
    } else {
      console.log('No new links found in this mutation');
    }
  });

  observer.observe(target, { childList: true, subtree: true });
  console.log('MutationObserver started on chat-history-list');
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

  spans.forEach(span => {
    const text = span.textContent || '';
    const allLinks = [...text.matchAll(urlRegex)].map(m => m[0]).filter(link => link !== window.location.href);

    if (allLinks.length > 0) {
      console.log(`Initial scan found ${allLinks.length} links:`, allLinks);
    } else {
      console.log('No links in initial span:', text);
    }

    allLinks.forEach(url => {
      if (isUserProfile(url) || isStaticPageLink(url)) return;

      if (isImageUrl(url) && !span.querySelector('img')) {
        const preview = createImagePreview(url);
        console.log('Appending image preview to chat (initial):', url);
        span.appendChild(preview);
        imageLinks.push(url);
      } else if (isVideoUrl(url) && !span.querySelector('video')) {
        const preview = createVideoPreview(url);
        console.log('Appending video preview to chat (initial):', url);
        span.appendChild(preview);
        videoLinks.push(url);
      } else {
        categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
      }
    });

    span.dataset.processed = true;
  });

  if (youtubeLinks.length || shortsLinks.length || twitterLinks.length || imageLinks.length || videoLinks.length || otherLinks.length) {
    console.log('Initial links to store:', { youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks });
    storeLinks(youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks);
  } else {
    console.log('No links found in initial scan');
  }
}

function categorizeLink(url, youtubeLinks, shortsLinks, twitterLinks, imageLinks, videoLinks, otherLinks) {
  if (shortsRegex.test(url) && !shortsLinks.includes(url)) {
    shortsLinks.push(url);
    console.log(`Categorized as Shorts: ${url}`);
  } else if (youtubeRegex.test(url) && !youtubeLinks.includes(url)) {
    youtubeLinks.push(url);
    console.log(`Categorized as YouTube: ${url}`);
  } else if (twitterRegex.test(url) && !twitterLinks.includes(url)) {
    twitterLinks.push(url);
    console.log(`Categorized as Twitter: ${url}`);
  } else if (isImageUrl(url) && !imageLinks.includes(url)) {
    imageLinks.push(url);
    console.log(`Categorized as Image: ${url}`);
  } else if (isVideoUrl(url) && !videoLinks.includes(url)) {
    videoLinks.push(url);
    console.log(`Categorized as Video: ${url}`);
  } else if (!otherLinks.includes(url)) {
    otherLinks.push(url);
    console.log(`Categorized as Other: ${url}`);
  }
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

setTimeout(() => {
  console.log('Initial load complete, starting to process mutations');
  initialLoadComplete = true;
  processInitialChat();
}, 2000);