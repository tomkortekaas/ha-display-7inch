// Energy overview screen — main "hero" screen
// Inspired by energy-monitor displays: three primary ring metrics + side bars

function EnergyScreen({ data, setData, accents }) {
  const { power, water, gas, gridImport, gridExport, solar, cost, temp, dynamicPrice } = data;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr 0.9fr", gap: 14, height: "100%" }}>
      {/* Hero ring: current power */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Huidig vermogen</div>
            <div style={{ fontSize: 11, color: "var(--ink-low)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>sensor.p1_active_power</div>
          </div>
          <div className="pill" style={{ color: accents.power, background: `${accents.power}1a` }}>
            <span className="dot" />LIVE
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Ring size={250} stroke={18} value={Math.min(power, 3500)} max={3500} color={accents.power} dim={`${accents.power}22`}>
            <div className="ring-value" style={{ fontSize: 76 }}>{power}</div>
            <div className="ring-unit" style={{ color: accents.power, fontSize: 22 }}>W</div>
          </Ring>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: -4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <Icon.arrowUp style={{ width: 14, height: 14, color: accents.solar }} />
            <span style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{gridExport}</span>
            <span style={{ color: "var(--ink-dim)", fontSize: 11, fontWeight: 600 }}>kWh</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <Icon.arrowDown style={{ width: 14, height: 14, color: accents.power }} />
            <span style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{gridImport}</span>
            <span style={{ color: "var(--ink-dim)", fontSize: 11, fontWeight: 600 }}>kWh</span>
          </div>
        </div>
      </div>

      {/* Middle column: water + gas rings stacked */}
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 14 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title" style={{ margin: 0 }}>Water</div>
            <Icon.drop style={{ width: 16, height: 16, color: accents.water }} />
          </div>
          <div style={{ display: "grid", placeItems: "center", flex: 1 }}>
            <Ring size={130} stroke={11} value={water} max={500} color={accents.water} dim={`${accents.water}22`}>
              <div className="ring-value" style={{ fontSize: 36 }}>{water}</div>
              <div className="ring-unit" style={{ color: accents.water, fontSize: 14 }}>L</div>
            </Ring>
          </div>
          <div style={{ textAlign: "center", color: "var(--ink-low)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>vandaag</div>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title" style={{ margin: 0 }}>Gas</div>
            <Icon.flame style={{ width: 16, height: 16, color: accents.gas }} />
          </div>
          <div style={{ display: "grid", placeItems: "center", flex: 1 }}>
            <Ring size={130} stroke={11} value={gas} max={20} color={accents.gas} dim={`${accents.gas}22`}>
              <div className="ring-value" style={{ fontSize: 36 }}>{gas}</div>
              <div className="ring-unit" style={{ color: accents.gas, fontSize: 14 }}>m³</div>
            </Ring>
          </div>
          <div style={{ textAlign: "center", color: "var(--ink-low)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>vandaag</div>
        </div>
      </div>

      {/* Right column: bar metrics */}
      <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 18 }}>
        <div className="card-title">Vandaag</div>
        <BarMetric
          icon={<Icon.bolt />}
          value={cost.toFixed(2).split(".")[0]}
          sub={cost.toFixed(2).split(".")[1]}
          unit="€"
          pct={(cost / 25) * 100}
          color={accents.cost}
          label="Energiekosten"
        />
        <BarMetric
          icon={<Icon.sun />}
          value={solar}
          unit="kWh"
          pct={(solar / 30) * 100}
          color={accents.solar}
          label="Zonne-opbrengst"
        />
        <BarMetric
          icon={<Icon.thermo />}
          value={dynamicPrice.toFixed(2)}
          unit="€/kWh"
          pct={(dynamicPrice / 0.5) * 100}
          color={accents.heat}
          label="Dynamische prijs"
        />
        <BarMetric
          icon={<Icon.home />}
          value={temp.toFixed(1)}
          unit="°C"
          pct={((temp - 15) / 10) * 100}
          color={accents.water}
          label="Binnen"
        />
      </div>
    </div>
  );
}

window.EnergyScreen = EnergyScreen;
