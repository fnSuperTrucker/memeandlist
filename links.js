function createLinkElement(url, clickedLinks, isImage = false, isVideo = false) {
  const li = document.createElement('li');
  li.dataset.url = url; // Store the URL in the <li> for comparison in updateList

  if (isImage) {
    const a = document.createElement('a');
    a.href = url;
    a.onclick = (event) => {
      event.preventDefault();
      chrome.storage.local.get({ clickedLinks: [] }, data => {
        const updatedClickedLinks = [...new Set([...data.clickedLinks, url])];
        chrome.storage.local.set({ clickedLinks: updatedClickedLinks });
      });
      chrome.tabs.create({ url });
    };

    const img = document.createElement('img');
    img.src = url;
    img.className = 'preview';
    if (clickedLinks.includes(url)) img.style.opacity = '0.5';
    a.appendChild(img);
    li.appendChild(a);
  } else if (isVideo) {
    const a = document.createElement('a');
    a.href = url;
    a.onclick = (event) => {
      event.preventDefault();
      chrome.storage.local.get({ clickedLinks: [] }, data => {
        const updatedClickedLinks = [...new Set([...data.clickedLinks, url])];
        chrome.storage.local.set({ clickedLinks: updatedClickedLinks });
      });
      chrome.tabs.create({ url });
    };

    const container = document.createElement('div');
    container.className = 'video-preview-container';

    const video = document.createElement('video');
    video.src = url;
    video.className = 'preview';
    video.preload = 'none'; // Delay metadata load until visible
    video.autoplay = false;
    video.muted = true;
    video.controls = false;
    video.loop = true;
    if (clickedLinks.includes(url)) video.style.opacity = '0.5';
    container.appendChild(video);

    // Use IntersectionObserver to load metadata only when the video is visible
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        video.preload = 'metadata'; // Load metadata when visible
        video.onloadedmetadata = () => {
          video.currentTime = 1; // Seek to 1 second to show a non-dark frame
        };
        video.onerror = () => {
          video.style.backgroundColor = '#000'; // Black background if load fails
        };
        observer.disconnect();
      }
    });
    observer.observe(video);

    // Play the video on hover
    container.onmouseenter = () => {
      video.play().catch(() => {
        // If play fails (e.g., due to browser policies), do nothing
      });
    };

    // Pause the video when not hovering
    container.onmouseleave = () => {
      video.pause();
      video.currentTime = 1; // Reset to 1 second to show the static frame
    };

    a.appendChild(container);
    li.appendChild(a);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.onclick = (event) => {
      event.preventDefault();
      chrome.storage.local.get({ clickedLinks: [] }, data => {
        const updatedClickedLinks = [...new Set([...data.clickedLinks, url])];
        chrome.storage.local.set({ clickedLinks: updatedClickedLinks });
      });
      chrome.tabs.create({ url });
    };
    if (clickedLinks.includes(url)) a.style.color = '#ff0000';
    li.appendChild(a);
  }

  return li;
}

function updateList() {
  chrome.storage.local.get({
    youtubeLinks: [], shortsLinks: [], twitterLinks: [],
    imageLinks: [], videoLinks: [], otherLinks: [], clickedLinks: []
  }, data => {
    const youtubeList = document.getElementById('youtubeList');
    const shortsList = document.getElementById('shortsList');
    const twitterList = document.getElementById('twitterList');
    const imageList = document.getElementById('imageList');
    const videoList = document.getElementById('videoList');
    const otherList = document.getElementById('otherList');

    const clickedLinks = data.clickedLinks || [];

    // Helper function to update a list without causing flashes
    const updateListSection = (listElement, links, isImage = false, isVideo = false) => {
      const currentUrls = Array.from(listElement.children).map(li => li.dataset.url);
      const newUrls = links.slice().reverse();

      // If the URLs haven't changed, update opacity for clicked links without re-rendering
      if (JSON.stringify(currentUrls) === JSON.stringify(newUrls)) {
        listElement.querySelectorAll('li').forEach(li => {
          const url = li.dataset.url;
          const video = li.querySelector('video.preview');
          const img = li.querySelector('img.preview');
          const a = li.querySelector('a');
          if (video) {
            video.style.opacity = clickedLinks.includes(url) ? '0.5' : '1';
          } else if (img) {
            img.style.opacity = clickedLinks.includes(url) ? '0.5' : '1';
          } else if (a) {
            a.style.color = clickedLinks.includes(url) ? '#ff0000' : '#8ab4f8';
          }
        });
        return;
      }

      // If the URLs have changed, re-render the list
      listElement.innerHTML = '';
      // Remove the "No links found" message by not adding anything when links.length === 0
      if (links.length > 0) {
        links.reverse().forEach(url => {
          listElement.appendChild(createLinkElement(url, clickedLinks, isImage, isVideo));
        });
      }
    };

    updateListSection(youtubeList, data.youtubeLinks);
    updateListSection(shortsList, data.shortsLinks);
    updateListSection(twitterList, data.twitterLinks);
    updateListSection(imageList, data.imageLinks, true);
    updateListSection(videoList, data.videoLinks, false, true);
    updateListSection(otherList, data.otherLinks);

    // Store the current data to compare in the next update
    youtubeList.dataset.links = JSON.stringify(data.youtubeLinks);
    shortsList.dataset.links = JSON.stringify(data.shortsLinks);
    twitterList.dataset.links = JSON.stringify(data.twitterLinks);
    imageList.dataset.links = JSON.stringify(data.imageLinks);
    videoList.dataset.links = JSON.stringify(data.videoLinks);
    otherList.dataset.links = JSON.stringify(data.otherLinks);
  });
}

setInterval(updateList, 1500);
updateList();

document.getElementById('clearButton').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all links?')) {
    chrome.storage.local.set({
      youtubeLinks: [], shortsLinks: [], twitterLinks: [],
      imageLinks: [], videoLinks: [], otherLinks: [], clickedLinks: []
    }, updateList);
  }
});