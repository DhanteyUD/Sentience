const INFO_ROWS = [
  { label: "Network", value: "DEVNET", color: "text-cyan-400" },
  { label: "Encryption", value: "AES-256-CBC", color: "text-[#39ff14]" },
  {
    label: "Key Derivation",
    value: "PBKDF2 (10k iter)",
    color: "text-[#39ff14]",
  },
  { label: "Signing", value: "Ed25519 Auto", color: "text-white" },
  { label: "DEX", value: "Jupiter V6", color: "text-white" },
  {
    label: "Framework",
    value: "Custom + EventEmitter",
    color: "text-violet-400",
  },
];

export function SystemInfo() {
  return (
    <div className="p-4 space-y-3">
      {INFO_ROWS.map(({ label, value, color }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{label}</span>
          <span className={`font-mono text-xs font-bold ${color}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
