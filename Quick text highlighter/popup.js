let updateInterval;
let startTime = 0;
let storedTime = 0;
let currentSite = '';

document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('start');
  const resetBtn = document.getElementById('reset');
  const circle = document.getElementById('circle');
  const timeDisplay = document.getElementById('time-display');
  const list = document.getElementById('list');

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    currentSite = new URL(tabs[0].url).hostname;
    chrome.storage.local.get(['startTime', 'currentSite', currentSite], function(data) {
      if (data.currentSite === currentSite && data.startTime) {
        startTime = data.startTime;
        storedTime = data[currentSite] || 0;
        circle.classList.add('tracking');
        startBtn.textContent = 'Stop';
      } else {
        storedTime = data[currentSite] || 0;
      }
      loadSites();
      updateInterval = setInterval(function() {
        updateDisplay();
        loadSites();
      }, 1000);
    });
  });

  startBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'toggleTracking' });
    updateTrackingStatus();
  });

  resetBtn.addEventListener('click', function() {
    chrome.storage.local.clear();
    startTime = 0;
    storedTime = 0;
    updateDisplay();
    list.innerHTML = '';
    clearInterval(updateInterval);
    circle.classList.remove('tracking');
    startBtn.textContent = 'Start';
  });

  function updateDisplay() {
    let currentTime = storedTime;
    if (startTime) {
      currentTime += Date.now() - startTime;
    }
    const minutes = Math.floor(currentTime / 60000);
    const seconds = Math.floor((currentTime % 60000) / 1000);
    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const progress = Math.min((currentTime / 60000) * 360, 360); // Changed to 1 min for testing
    circle.style.background = `conic-gradient(#4caf50 ${progress}deg, #ddd ${progress}deg)`;
  }

  function updateTrackingStatus() {
    chrome.runtime.sendMessage({ action: 'getTrackingStatus' }, function(response) {
      if (response.isTracking && response.currentSite === currentSite) {
        startTime = response.startTime;
        circle.classList.add('tracking');
        startBtn.textContent = 'Stop';
      } else {
        startTime = 0;
        circle.classList.remove('tracking');
        startBtn.textContent = 'Start';
        chrome.storage.local.get([currentSite], function(data) {
          storedTime = data[currentSite] || 0;
        });
      }
    });
  }

  function loadSites() {
    chrome.storage.local.get(null, function(data) {
      list.innerHTML = '';
      for (let site in data) {
        if (site !== 'startTime' && site !== 'currentSite') {
          const div = document.createElement('div');
          div.className = 'site';
          let time = data[site] || 0;
          if (site === currentSite && startTime) {
            time += Date.now() - startTime;
          }
          const minutes = Math.floor(time / 60000);
          div.innerHTML = `<span>${site}</span><span class="time">${minutes} min</span>`;
          if (minutes > 1) div.classList.add('excess'); // Changed to 1 min for testing
          list.appendChild(div);
        }
      }
    });
  }
});