// Weather screen — current + hourly + daily forecast

function WeatherScreen({ data, accents }) {
  const { weather } = data;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, height: "100%" }}>
      {/* Now */}
      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div className="card-title" style={{ margin: 0 }}>{weather.location}</div>
          <div style={{ fontSize: 11, color: "var(--ink-low)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>weather.knmi_amsterdam</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          <div style={{ color: accents.solar }}>
            <Icon.sun style={{ width: 96, height: 96 }} />
          </div>
          <div>
            <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
              {weather.now.temp}<span style={{ fontSize: 38, color: "var(--ink-dim)" }}>°</span>
            </div>
            <div style={{ fontSize: 16, color: "var(--ink-dim)", fontWeight: 500, marginTop: 4 }}>
              {weather.now.condition} · voelt als {weather.now.feels}°
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { icon: <Icon.rain />, label: "Neerslag", val: `${weather.now.precip}%`, color: accents.water },
            { icon: <Icon.wind />, label: "Wind", val: `${weather.now.wind} km/u`, color: accents.solar },
            { icon: <Icon.drop />, label: "Vochtigheid", val: `${weather.now.humidity}%`, color: accents.gas },
          ].map((m) => (
            <div key={m.label} style={{ background: "var(--card-2)", borderRadius: 10, padding: 10 }}>
              <div style={{ color: m.color, marginBottom: 4 }}>{React.cloneElement(m.icon, { style: { width: 18, height: 18 } })}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{m.val}</div>
              <div style={{ fontSize: 10, color: "var(--ink-low)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Vandaag · per uur</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {weather.hourly.map((h, i) => (
              <div key={i} style={{
                background: "var(--card-2)",
                borderRadius: 10,
                padding: "10px 4px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "var(--ink-dim)", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>{h.time}</div>
                <div style={{ color: h.icon === "sun" ? accents.solar : h.icon === "cloud" ? "#8a8a93" : accents.water, margin: "6px 0" }}>
                  {h.icon === "sun" ? <Icon.sun style={{ width: 22, height: 22, margin: "0 auto" }} /> :
                   h.icon === "cloud" ? <Icon.cloud style={{ width: 22, height: 22, margin: "0 auto" }} /> :
                   <Icon.rain style={{ width: 22, height: 22, margin: "0 auto" }} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{h.temp}°</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column" }}>
          <div className="card-title">5 dagen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {weather.daily.map((d, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "60px 28px 1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "6px 10px",
                background: "var(--card-2)",
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--ink)" : "var(--ink-dim)" }}>{d.day}</div>
                <div style={{ color: d.icon === "sun" ? accents.solar : d.icon === "cloud" ? "#8a8a93" : accents.water }}>
                  {d.icon === "sun" ? <Icon.sun style={{ width: 18, height: 18 }} /> :
                   d.icon === "cloud" ? <Icon.cloud style={{ width: 18, height: 18 }} /> :
                   <Icon.rain style={{ width: 18, height: 18 }} />}
                </div>
                <TempRange low={d.low} high={d.high} min={weather.range.min} max={weather.range.max} colorLow={accents.water} colorHigh={accents.heat} />
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--ink-dim)" }}>
                  <span style={{ color: "var(--ink)" }}>{d.high}°</span> · {d.low}°
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TempRange({ low, high, min, max, colorLow, colorHigh }) {
  const total = max - min;
  const start = ((low - min) / total) * 100;
  const end = ((high - min) / total) * 100;
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        left: `${start}%`, width: `${end - start}%`,
        background: `linear-gradient(90deg, ${colorLow} 0%, ${colorHigh} 100%)`,
        borderRadius: 3,
      }} />
    </div>
  );
}

window.WeatherScreen = WeatherScreen;
