// Weather fetch from Open-Meteo for Dundee. (Feature 9)

const WEATHER_CODES = {
  0: ['☀️', 'Clear sky'],
  1: ['🌤', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫', 'Foggy'], 48: ['🌫', 'Icy fog'],
  51: ['🌦', 'Light drizzle'], 53: ['🌦', 'Drizzle'], 55: ['🌧', 'Heavy drizzle'],
  61: ['🌧', 'Light rain'], 63: ['🌧', 'Rain'], 65: ['🌧', 'Heavy rain'],
  71: ['🌨', 'Light snow'], 73: ['🌨', 'Snow'], 75: ['❄️', 'Heavy snow'],
  80: ['🌦', 'Showers'], 81: ['🌧', 'Rain showers'], 82: ['⛈', 'Violent showers'],
  95: ['⛈', 'Thunderstorm'], 96: ['⛈', 'Thunderstorm + hail'], 99: ['⛈', 'Thunderstorm + hail'],
};

async function loadWeather() {
  const strip = document.getElementById('weather-strip');
  if (!strip) return;

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=56.462&longitude=-2.9707&current=temperature_2m,weathercode&timezone=Europe%2FLondon'
    );
    if (!res.ok) return;
    const json = await res.json();

    const temp = Math.round(json.current.temperature_2m);
    const code = json.current.weathercode;
    const [icon, condition] = WEATHER_CODES[code] || ['🌡', 'Unknown'];

    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-condition').textContent = `${condition} · Dundee`;
    strip.style.display = 'flex';
  } catch (e) {
    // Silently fail — weather is non-critical
  }
}
