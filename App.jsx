import { useEffect, useState, useRef } from "react";

export default function App() {
  const [market, setMarket] = useState("NIFTY");
  const [expiry, setExpiry] = useState("");
  const [expiries, setExpiries] = useState([]);
  const [signals, setSignals] = useState([]);
  const [timestamp, setTimestamp] = useState("");
  const [toast, setToast] = useState(null);
  const audioRef = useRef(null);
  const lastStrongSignalsRef = useRef(new Set());

  const loadSignals = async (mkt = market, exp = expiry) => {
    try {
      const res = await fetch(`http://localhost:8000/signals?market=${mkt}&expiry=${exp}`);
      const data = await res.json();
      setSignals(data.signals || []);
      setTimestamp(data.timestamp || "");
      setExpiries(data.available_expiries || []);
      if (!exp && data.available_expiries?.length) setExpiry(data.available_expiries[0]);

      // detect new strong signals
      const currentStrong = new Set();
      (data.signals || []).forEach((s) => {
        if (s.strength === "Strong") {
          const sigKey = `${s.symbol}-${s.timestamp}`;
          currentStrong.add(sigKey);
          if (!lastStrongSignalsRef.current.has(sigKey)) {
            // beep
            audioRef.current && audioRef.current.play().catch(() => {});
            // toast notification
            setToast(`🚀 New Strong Signal: ${s.symbol}`);
          }
        }
      });
      lastStrongSignalsRef.current = currentStrong;
    } catch (error) {
      console.error("Error fetching signals:", error);
    }
  };

  useEffect(() => {
    loadSignals(market, expiry);
    const interval = setInterval(() => loadSignals(market, expiry), 5000);
    return () => clearInterval(interval);
  }, [market, expiry]);

  return (
    <div className="p-6">
      <audio ref={audioRef} src="/beep.mp3" preload="auto" />
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-4">Live Trade Signals</h1>

      <div className="flex gap-4 mb-4">
        <select
          value={market}
          onChange={(e) => { setMarket(e.target.value); setExpiry(""); }}
          className="border rounded-lg p-2"
        >
          <option value="NIFTY">NIFTY</option>
          <option value="BANKNIFTY">BANKNIFTY</option>
          <option value="SENSEX">SENSEX</option>
        </select>

        <select
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="border rounded-lg p-2"
        >
          {expiries.map((exp) => (
            <option key={exp} value={exp}>{exp}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">Last Updated: {timestamp}</p>

      <div className="grid gap-4">
        {signals.map((sig, i) => (
          <div key={i} className="p-4 rounded-xl shadow border">
            <p className="font-semibold">{sig.symbol} — {sig.type}</p>
            <p>Entry: {sig.entry} | Exit: {sig.exit}</p>
            <p className="text-xs text-gray-500">Generated: {sig.timestamp}</p>
            <p className={`mt-1 font-semibold ${
              sig.strength === "Strong"
                ? "text-green-600"
                : sig.strength === "Medium"
                ? "text-yellow-600"
                : "text-red-600"
            }`}>Strength: {sig.strength}</p>
          </div>
        ))}
      </div>
    </div>
  );
  }
