function createLinkElement(url, clickedLinks, isImage = false, isVideo = false) {
  const li = document.createElement('li');
  li.dataset.url = url;

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
    video.preload = 'none';
    video.autoplay = false;
    video.muted = true;
    video.controls = false;
    video.loop = true;
    if (clickedLinks.includes(url)) video.style.opacity = '0.5';
    container.appendChild(video);

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          video.currentTime = 1;
        };
        video.onerror = () => {
          video.style.backgroundColor = '#000';
        };
        observer.disconnect();
      }
    });
    observer.observe(video);

    container.onmouseenter = () => {
      video.play().catch(() => {});
    };

    container.onmouseleave = () => {
      video.pause();
      video.currentTime = 1;
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
  console.log('Updating links list...');
  chrome.storage.local.get({
    youtubeLinks: [], shortsLinks: [], twitterLinks: [],
    imageLinks: [], videoLinks: [], otherLinks: [], 
    clickedLinks: [], allowedSites: [], whitelistEnabled: false
  }, data => {
    console.log('Retrieved from storage:', data);

    const youtubeList = document.getElementById('youtubeList');
    const shortsList = document.getElementById('shortsList');
    const twitterList = document.getElementById('twitterList');
    const imageList = document.getElementById('imageList');
    const videoList = document.getElementById('videoList');
    const otherList = document.getElementById('otherList');
    const whitelist = document.getElementById('whitelist');
    const toggleButton = document.getElementById('toggleWhitelist');

    const clickedLinks = data.clickedLinks || [];

    const updateListSection = (listElement, links, isImage = false, isVideo = false) => {
      const currentUrls = Array.from(listElement.children).map(li => li.dataset.url);
      const newUrls = links.slice().reverse();

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

      listElement.innerHTML = '';
      if (links.length > 0) {
        links.reverse().forEach(url => {
          listElement.appendChild(createLinkElement(url, clickedLinks, isImage, isVideo));
        });
      }
      console.log(`Updated ${listElement.id} with ${links.length} links`);
    };

    updateListSection(youtubeList, data.youtubeLinks);
    updateListSection(shortsList, data.shortsLinks);
    updateListSection(twitterList, data.twitterLinks);
    updateListSection(imageList, data.imageLinks, true);
    updateListSection(videoList, data.videoLinks, false, true);
    updateListSection(otherList, data.otherLinks);

    // Update whitelist
    const currentSites = Array.from(whitelist.children).map(li => li.dataset.site);
    if (JSON.stringify(currentSites) !== JSON.stringify(data.allowedSites)) {
      whitelist.innerHTML = '';
      data.allowedSites.forEach(site => {
        const li = document.createElement('li');
        li.dataset.site = site;
        li.textContent = site;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => {
          const newSites = data.allowedSites.filter(s => s !== site);
          chrome.storage.local.set({ allowedSites: newSites }, updateList);
        };
        li.appendChild(removeButton);
        whitelist.appendChild(li);
      });
    }

    // Update toggle button text
    toggleButton.textContent = `Toggle Whitelist (${data.whitelistEnabled ? 'On' : 'Off'})`;
  });
}

setInterval(updateList, 1500);
updateList();

document.getElementById('clearButton').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all links?')) {
    chrome.storage.local.set({
      youtubeLinks: [], shortsLinks: [], twitterLinks: [],
      imageLinks: [], videoLinks: [], otherLinks: [], clickedLinks: []
    }, () => {
      console.log('Storage cleared');
      updateList();
    });
  }
});

document.getElementById('toggleWhitelist').addEventListener('click', () => {
  chrome.storage.local.get('whitelistEnabled', data => {
    const newState = !data.whitelistEnabled;
    chrome.storage.local.set({ whitelistEnabled: newState }, () => {
      console.log(`Whitelist toggled ${newState ? 'on' : 'off'}`);
      updateList();
    });
  });
});

document.getElementById('addSiteButton').addEventListener('click', () => {
  const input = document.getElementById('addSiteInput');
  const site = input.value.trim();
  if (site) {
    chrome.storage.local.get('allowedSites', data => {
      const sites = data.allowedSites || [];
      if (!sites.includes(site)) {
        sites.push(site);
        chrome.storage.local.set({ allowedSites: sites }, () => {
          input.value = '';
          updateList();
        });
      }
    });
  }
});