let currentFocus = -1;
let unit = 'metric';

const cityInput = document.getElementById("cityInput");
const suggestionBox = document.getElementById("suggestions");
const toggle = document.getElementById("themeToggle");
const body = document.body;

let currentTimezoneOffset = 0;

// ========== Debounce ==========
function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ========== Suggestions ==========
async function fetchSuggestionsFromAPI(query) {
  const limit = 20;
  const apiKey = "0d79a1aa4d00861d98e0c40c1bbbf704";
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Suggestion fetch failed");

    const data = await res.json();
    return data.filter(place =>
      place.name.toLowerCase().includes(query.toLowerCase())
    );
  } catch (err) {
    console.error(err);
    return [];
  }
}

const fetchSuggestions = async function () {
  const query = cityInput.value.trim();
  suggestionBox.innerHTML = "";
  currentFocus = -1;

  if (query.length < 2) return;

  const matches = await fetchSuggestionsFromAPI(query);

  if (matches.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No matches found";
    li.classList.add("no-suggestion");
    suggestionBox.appendChild(li);
    return;
  }

  matches.forEach((place) => {
    const li = document.createElement("li");
    const full = `${place.name}${place.state ? ", " + place.state : ""}, ${place.country}`;
    li.textContent = full;

    li.addEventListener("click", () => {
      cityInput.value = place.name;
      suggestionBox.innerHTML = "";
    });

    suggestionBox.appendChild(li);
  });
};

cityInput.addEventListener("input", debounce(fetchSuggestions, 200));

// ========== Keyboard Navigation ==========
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionBox.getElementsByTagName("li");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    currentFocus++;
    highlight(items);
  } else if (e.key === "ArrowUp") {
    currentFocus--;
    highlight(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentFocus > -1 && items[currentFocus]) {
      items[currentFocus].click();
    } else {
      getWeather();
    }
  }
});

function highlight(items) {
  for (let item of items) item.classList.remove("active-suggestion");
  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;
  items[currentFocus].classList.add("active-suggestion");
  items[currentFocus].scrollIntoView({ block: "nearest" });
}

document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestionBox.contains(e.target)) {
    suggestionBox.innerHTML = "";
  }
});

// ========== Get Weather ==========
async function getWeather(cityName = cityInput.value.trim()) {
  if (!cityName) return alert("Please enter a city name");

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=0d79a1aa4d00861d98e0c40c1bbbf704&units=${unit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod !== 200) throw new Error(data.message);

    const condition = data.weather[0].main;
    const iconCode = data.weather[0].icon;

    document.getElementById("cityName").textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById("temperature").textContent = `🌡️ ${data.main.temp} °${unit === "metric" ? "C" : "F"}`;
    document.getElementById("condition").textContent = `🌥️ ${condition}`;
    showWeatherIcon(iconCode);
    changeBackground(condition);

    document.getElementById("weatherResult").classList.remove("hidden");

    // Save timezone offset and start live clock
    currentTimezoneOffset = data.timezone;
    updateLiveClock();
    document.getElementById("datetime").classList.remove("hidden");

    getForecast(cityName);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function showWeatherIcon(iconCode) {
  document.getElementById("lottie-icon").innerHTML = `
    <img src="https://openweathermap.org/img/wn/${iconCode}@4x.png" class="weather-icon" />
  `;
}

// ========== Live Clock ==========
function updateLiveClock() {
  clearInterval(updateLiveClock.interval);

  function update() {
    const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
    const localTime = new Date(utc + currentTimezoneOffset * 1000);

    const dateStr = localTime.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const timeStr = localTime.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    document.getElementById("datetime").textContent = `${dateStr} • ${timeStr}`;
  }

  update();
  updateLiveClock.interval = setInterval(update, 1000);
}

// ========== Background ==========
function changeBackground(condition) {
  const root = document.documentElement;
  const animEl = document.getElementById("weather-anim");

  const gradients = {
    clear: ["#fceabb", "#f8b500"],
    clouds: ["#bdc3c7", "#2c3e50"],
    rain: ["#4e54c8", "#8f94fb"],
    drizzle: ["#4e54c8", "#8f94fb"],
    thunderstorm: ["#1f1c2c", "#928dab"],
    snow: ["#e0eafc", "#cfdef3"],
    mist: ["#cfd9df", "#e2ebf0"],
    fog: ["#cfd9df", "#e2ebf0"],
    default: ["#e0f7fa", "#ffffff"]
  };

  const animations = {
  clear: "animations/sunny.gif",              // Sunny
  clouds: "animations/cloudy.gif",              // Cloudy
  rain: "animations/rainy.gif",               // Rain
  drizzle: "animations/light_rainy.gif",            // Light rain
  thunderstorm: "animations/thunderstorm.gif",         // Thunderstorm
  snow: "animations/snow.gif",                // Snow
  mist: "animations/mist.gif",                // Mist
  fog: "animations/fog.gif",                 // Fog
  default: "animations/default.gif"              // Default cloudy
};



  const lower = condition.toLowerCase();
  const [start, end] = gradients[lower] || gradients["default"];
  const animURL = animations[lower] || animations["default"];

  root.style.setProperty('--bg-start', start);
  root.style.setProperty('--bg-end', end);
    animEl.src = animURL + "?t=" + new Date().getTime(); // 💡 force reload every time
}

// ========== Forecast ==========
async function getForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=0d79a1aa4d00861d98e0c40c1bbbf704&units=${unit}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.cod !== "200") throw new Error(data.message);

    const list = data.list;
    const forecastCards = document.getElementById("forecastCards");
    forecastCards.innerHTML = "";

    for (let i = 0; i < list.length; i += 8) {
      const item = list[i];
      const date = new Date(item.dt * 1000);
      const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      const icon = item.weather[0].icon;
      const temp = item.main.temp.toFixed(1);

      const card = document.createElement("div");
      card.className = "forecast-card";
      card.innerHTML = `
        <div>${day}</div>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
        <div>${temp}°${unit === "metric" ? "C" : "F"}</div>
      `;
      forecastCards.appendChild(card);
    }

    document.getElementById("forecastContainer").classList.remove("hidden");
  } catch (err) {
    console.error("Forecast error:", err);
  }
}

// ========== Theme ==========
toggle.addEventListener("change", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
});

// ========== DOM Ready ==========
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
    toggle.checked = true;
  }
  changeBackground("default");
  // Live clock even before weather fetched
  // updateLiveClock();
});

// ========== Units ==========
document.querySelectorAll('input[name="unit"]').forEach(radio => {
  radio.addEventListener("change", (e) => {
    unit = e.target.value;
    getWeather();
  });
});

// ========== Geolocation ==========
function useMyLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=0d79a1aa4d00861d98e0c40c1bbbf704&units=${unit}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.cod !== 200) throw new Error(data.message);

      cityInput.value = data.name;
      getWeather(data.name);
    } catch (err) {
      alert("Location error: " + err.message);
    }
  }, () => alert("Unable to retrieve your location"));
}
