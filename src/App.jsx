import "./App.css";
import { useWeather } from "./hooks/useWeather";

function App() {
  const { weather, location, loading, error } = useWeather();

  if (loading) {
    return (
      <div className="app app--loading">
        <div className="loader">
          <div className="loader-spinner" />
          <p className="loader-text">Fetching atmosphere…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app--error">
        <div className="error-card">
          <h2>Something went sideways</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="brand">Aura</h1>
          <p className="tagline">Atmospheric Intelligence</p>
        </div>
        <div className="location-pill">
          📍 {location.name}
          {location.country ? `, ${location.country}` : ""}
        </div>
      </header>

      <main className="bento">
        <section className="bento-hero">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "64px", fontWeight: 200 }}>
              {Math.round(weather.current.temperature_2m)}°F
            </div>
            <div style={{ opacity: 0.7, marginTop: "8px" }}>
              Feels like {Math.round(weather.current.apparent_temperature)}°F
            </div>
          </div>
        </section>
        <section className="bento-chart">Hourly chart</section>
        <section className="bento-forecast">7-day forecast</section>
        <section className="bento-aqi">
          {weather.aqi !== null ? `AQI ${weather.aqi}` : "Air quality"}
        </section>
        <section className="bento-uv">
          UV {weather.daily.uv_index_max[0]?.toFixed(1) || "—"}
        </section>
        <section className="bento-sun">Sun times</section>
      </main>
    </div>
  );
}

export default App;