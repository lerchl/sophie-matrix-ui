import { useState, useEffect, type ReactNode } from "react";
import { Disc3, ImageIcon, RefreshCw, ExternalLink, type LucideIcon } from "lucide-react";

type DisplayMode = "cover" | "vinyl";
type ReauthState = "idle" | "working" | "done";

const GlobalStyle = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
    * { font-family: 'Space Mono', ui-monospace, monospace; }
  `}</style>
);

type SectionProps = {
    number: string;
    title: string;
    children: ReactNode;
};

const Section = ({ number, title, children }: SectionProps) => (
    <section className="border-2 border-black">
        <header className="flex items-baseline gap-3 border-b-2 border-black px-4 py-3">
            <span className="text-sm font-bold">{number}</span>
            <h2 className="text-base font-bold uppercase tracking-wide">{title}</h2>
        </header>
        <div className="p-4 flex flex-col gap-5">{children}</div>
    </section>
);

type SwitchProps = {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    sub?: string;
    id: string;
};

const Switch = ({ checked, onChange, label, sub, id }: SwitchProps) => (
    <div className="flex items-start justify-between gap-4">
        <div>
            <label htmlFor={id} className="text-sm font-bold cursor-pointer">
                {label}
            </label>
            {sub && <p className="text-xs mt-1 text-black/60">{sub}</p>}
        </div>
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`shrink-0 w-8 h-8 border-2 border-black flex items-center justify-center text-xs font-bold ${checked ? "bg-black text-white" : "bg-white text-black"
                }`}
        >
            {checked ? "AN" : "AUS"}
        </button>
    </div>
);

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

type TimeFieldProps = {
    label: string;
    value: string;
    onChange: (next: string) => void;
};

const TimeField = ({ label, value, onChange }: TimeFieldProps) => {
    const [h, m] = value.split(":");
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase">{label}</span>
            <div className="flex items-stretch border-2 border-black">
                <select
                    value={h}
                    onChange={(e) => onChange(`${e.target.value}:${m}`)}
                    aria-label={`${label}, Stunde`}
                    className="flex-1 min-w-0 appearance-none bg-white px-2 py-2 text-sm font-bold text-center focus:outline-none focus:bg-black focus:text-white"
                >
                    {HOURS.map((hh) => (
                        <option key={hh} value={hh}>{hh}</option>
                    ))}
                </select>
                <span className="flex items-center px-1 font-bold">:</span>
                <select
                    value={m}
                    onChange={(e) => onChange(`${h}:${e.target.value}`)}
                    aria-label={`${label}, Minute`}
                    className="flex-1 min-w-0 appearance-none bg-white px-2 py-2 text-sm font-bold text-center focus:outline-none focus:bg-black focus:text-white"
                >
                    {MINUTES.map((mm) => (
                        <option key={mm} value={mm}>{mm}</option>
                    ))}
                </select>
            </div>
        </label>
    );
};

type ModeOptionProps = {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    title: string;
    desc: string;
};

const ModeOption = ({ active, onClick, icon: Icon, title, desc }: ModeOptionProps) => (
    <button
        onClick={onClick}
        className={`text-left border-2 border-black p-3 flex flex-col gap-2 ${active ? "bg-black text-white" : "bg-white text-black"}`}
    >
        <Icon size={18} strokeWidth={2} />
        <p className="text-sm font-bold">{title}</p>
        <p className={`text-xs ${active ? "text-white/70" : "text-black/60"}`}>{desc}</p>
    </button>
);

export const App = () => {
    const [mode, setMode] = useState<DisplayMode>("cover");
    const [blackoutFrom, setBlackoutFrom] = useState<string>("23:00");
    const [blackoutTo, setBlackoutTo] = useState<string>("07:00");
    const [override, setOverride] = useState<boolean>(false);

    const [account] = useState({
        name: "Mira Ostrowski",
        handle: "mira.ostrowski",
        plan: "Premium",
        seit: "14. März 2026",
    });
    const [reauthState, setReauthState] = useState<ReauthState>("idle");

    useEffect(() => {
        if (reauthState !== "working") return;
        const t = setTimeout(() => setReauthState("done"), 1400);
        return () => clearTimeout(t);
    }, [reauthState]);
    useEffect(() => {
        if (reauthState !== "done") return;
        const t = setTimeout(() => setReauthState("idle"), 2200);
        return () => clearTimeout(t);
    }, [reauthState]);

    return (
        <div className="min-h-screen w-full bg-white text-black">
            <GlobalStyle />

            <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-8 border-b-4 border-black pb-4">
                    Sophie's Spotify Matrix
                </h1>

                <div className="flex flex-col gap-6">
                    {/* Dunkelphase */}
                    <Section number="01" title="Dunkelphase">
                        <p className="text-xs text-black/60">Die Matrix schaltet sich in diesem Zeitraum automatisch ab.</p>

                        <div className="grid grid-cols-2 gap-3">
                            <TimeField label="Von" value={blackoutFrom} onChange={setBlackoutFrom} />
                            <TimeField label="Bis" value={blackoutTo} onChange={setBlackoutTo} />
                        </div>

                        <Switch
                            id="override"
                            checked={override}
                            onChange={setOverride}
                            label="Trotzdem jetzt einschalten"
                            sub="Übersteuert die Dunkelphase"
                        />
                    </Section>

                    {/* Darstellung */}
                    <Section number="02" title="Darstellung">
                        <p className="text-xs text-black/60">Wie das Albumcover auf der Matrix erscheint.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ModeOption
                                active={mode === "cover"}
                                onClick={() => setMode("cover")}
                                icon={ImageIcon}
                                title="Ganzes Cover"
                                desc="Coverbild füllt jedes Pixel"
                            />
                            <ModeOption
                                active={mode === "vinyl"}
                                onClick={() => setMode("vinyl")}
                                icon={Disc3}
                                title="Drehende Vinyl"
                                desc="Cover als Schalplatte, dreht sich beim Abspielen"
                            />
                        </div>
                    </Section>

                    {/* Spotify-Konto */}
                    <Section number="03" title="Spotify-Konto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-2 border-black flex items-center justify-center text-xs font-bold shrink-0">
                                {account.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{account.name}</p>
                                <p className="text-xs text-black/60 truncate">@{account.handle} · {account.plan}</p>
                            </div>
                        </div>
                        <p className="text-xs text-black/60">Verbunden seit {account.seit}</p>

                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => setReauthState("working")}
                                disabled={reauthState !== "idle"}
                                className="inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 disabled:opacity-60"
                            >
                                <RefreshCw size={15} className={reauthState === "working" ? "animate-spin" : ""} />
                                {reauthState === "working" ? "Autorisierung läuft…" : reauthState === "done" ? "Erneut autorisiert" : "Erneut autorisieren"}
                            </button>
                            <a
                                href="https://www.spotify.com/account/apps/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 border-2 border-black text-sm font-bold px-4 py-2.5 hover:bg-black hover:text-white transition-colors"
                            >
                                Zugriff bei Spotify verwalten
                                <ExternalLink size={14} />
                            </a>
                            <p className="text-[11px] text-black/50 text-center">
                                Zugriff dieses Geräts kann jederzeit in Spotifys App-Berechtigungen entzogen werden.
                            </p>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
};
