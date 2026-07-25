import { useEffect, useState, useCallback, type ReactNode, useRef } from "react";
import { Disc3, ImageIcon, RefreshCw, ExternalLink, type LucideIcon, Trash2, Power, X } from "lucide-react";
import type { ConfigurationPatchDto, ConfigurationViewDto, ErrorDto, TimeDto } from "./model";

const BASE_URL_RGB = import.meta.env.VITE_BASE_URL_RGB;


const DEFAULT_CONFIG: ConfigurationViewDto = {
    mode: "FULL",
    brightness: 75,
    blackoutWindow: {
        start: { hour: 23, minute: 0 },
        end: { hour: 7, minute: 0 },
        override: false,
    },
    spotifyAuthorized: false,
    spotifyApiCredentials: {
        id: null,
        secretSet: false
    }
};

const parseErrorMessage = async (res: Response): Promise<string> => {
    try {
        const data: ErrorDto = await res.json();
        return data.message;
    } catch {
        return `HTTP ${res.status}`;
    }
};

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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type TimeFieldProps = {
    label: string;
    time: TimeDto;
    onChange: (next: TimeDto) => void;
};

const TimeField = ({ label, time, onChange }: TimeFieldProps) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase">{label}</span>
        <div className="flex items-stretch border-2 border-black">
            <select
                value={time.hour}
                onChange={(e) => onChange({ ...time, hour: Number(e.target.value) })}
                aria-label={`${label}, Stunde`}
                className="flex-1 min-w-0 appearance-none bg-white px-2 py-2 text-sm font-bold text-center focus:outline-none focus:bg-black focus:text-white"
            >
                {HOURS.map((hh) => (
                    <option key={hh} value={hh}>{String(hh).padStart(2, "0")}</option>
                ))}
            </select>
            <span className="flex items-center px-1 font-bold">:</span>
            <select
                value={time.minute}
                onChange={(e) => onChange({ ...time, minute: Number(e.target.value) })}
                aria-label={`${label}, Minute`}
                className="flex-1 min-w-0 appearance-none bg-white px-2 py-2 text-sm font-bold text-center focus:outline-none focus:bg-black focus:text-white"
            >
                {MINUTES.map((mm) => (
                    <option key={mm} value={mm}>{String(mm).padStart(2, "0")}</option>
                ))}
            </select>
        </div>
    </label>
);

type BrightnessFieldProps = {
    value: number;
    onChange: (next: number) => void;
};

const BrightnessField = ({ value, onChange }: BrightnessFieldProps) => (
    <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase">Helligkeit</span>
            <span className="text-sm font-bold">{value}%</span>
        </div>
        <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Helligkeit"
            className="w-full h-8 border-2 border-black accent-black"
        />
    </div>
);

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

type AuthorizationStatusProps = {
    authorized: boolean;
};

const AuthorizationStatus = ({ authorized }: AuthorizationStatusProps) => (
    <p className="flex items-center gap-2 text-sm font-bold">
        <span
            className={`inline-block w-3 h-3 border-2 border-black shrink-0 ${authorized ? "bg-black" : "bg-white"
                }`}
            aria-hidden="true"
        />
        {authorized ? "Autorisiert" : "Nicht autorisiert"}
    </p>
);

export const App = () => {
    const [config, setConfig] = useState<ConfigurationViewDto>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState<boolean>(true);
    const [secondStepShutdown, setSecondStepShutdown] = useState<boolean>(false);

    const sendConfig = useCallback(async (newConfig: Partial<ConfigurationPatchDto>): Promise<ConfigurationViewDto> => {
        const old = config;
        try {
            const res = await fetch(`${BASE_URL_RGB}/configuration`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newConfig),
            });
            return await res.json() as ConfigurationViewDto;
        } catch (e) {
            console.error("Konfiguration konnte nicht gespeichert werden:", e);
            return old;
        }

    }, [config]);

    const patchConfig = useCallback(
        async (partial: Partial<ConfigurationPatchDto>) => {
            const newConfig = await sendConfig(partial);
            setConfig(newConfig);
        },
        [sendConfig],
    );

    // The one legitimate effect here: load the current state from the
    // device when the page opens.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${BASE_URL_RGB}/configuration`);
                if (!res.ok) throw new Error(await parseErrorMessage(res));
                const fetchedConfig: ConfigurationViewDto = await res.json();
                setConfig(fetchedConfig);
            } catch (e) {
                console.error("Konfiguration konnte nicht geladen werden:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const [clientIdDraft, setClientIdDraft] = useState<string>("");

    useEffect(() => {
        setClientIdDraft(config.spotifyApiCredentials.id || "");
    }, [config])
    const [secretDraft, setSecretDraft] = useState<string>("");

    // In the load effect, alongside the rest:
    // setClientIdDraft(view.spotifyApiCredentials.id ?? "");
    // setCredentials(view.spotifyApiCredentials);

    // Generic debounced single-field PATCH. Each field gets its own timer so
    // typing in one input never delays or bundles with another.
    const debounceTimers = useRef<Partial<Record<keyof ConfigurationPatchDto, ReturnType<typeof setTimeout>>>>({});

    const debouncedPatchField = useCallback(
        <K extends keyof ConfigurationPatchDto>(key: K, value: ConfigurationPatchDto[K], delay = 600) => {
            const existing = debounceTimers.current[key];
            if (existing) clearTimeout(existing);
            debounceTimers.current[key] = setTimeout(async () => {
                patchConfig({
                    [key]: value,
                })
            }, delay);
        },
        [patchConfig],
    );

    useEffect(() => {
        // Clear any pending debounced saves on unmount.
        return () => {
            Object.values(debounceTimers.current).forEach((t) => t && clearTimeout(t));
        };
    }, []);

    const handleClientIdChange = (value: string) => {
        setClientIdDraft(value);
        debouncedPatchField("spotifyApiCredentialsId", value);
    };

    const handleSecretChange = (value: string) => {
        setSecretDraft(value);
        debouncedPatchField("spotifyApiCredentialsSecret", value);
    };

    const clearCredentials = async () => patchConfig({
        spotifyApiCredentialsId: null,
        spotifyApiCredentialsSecret: null,
    });

    type StatusDotProps = {
        active: boolean;
        label: string;
    };

    const StatusDot = ({ active, label }: StatusDotProps) => (
        <p className="flex items-center gap-2 text-sm font-bold">
            <span
                className={`inline-block w-3 h-3 border-2 border-black shrink-0 ${active ? "bg-black" : "bg-white"
                    }`}
                aria-hidden="true"
            />
            {label}
        </p>
    );

    return (
        <div className="min-h-screen w-full bg-white text-black">
            <GlobalStyle />

            <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-8 border-b-4 border-black pb-4">
                    Sophies Spotify Matrix
                </h1>

                {loading ? (
                    <p className="text-sm font-bold">Lädt Konfiguration…</p>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Darstellung */}
                        <Section number="01" title="Darstellung">
                            <p className="text-xs text-black/60">In welchem Style das Albumcover auf dem Display angezeigt wird.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <ModeOption
                                    active={config.mode === "FULL"}
                                    onClick={() => patchConfig({ mode: "FULL" })}
                                    icon={ImageIcon}
                                    title="Quadratisch, statisch"
                                    desc="Das Cover deckt das ganze Display ab."
                                />
                                <ModeOption
                                    active={config.mode === "VINYL"}
                                    onClick={() => patchConfig({ mode: "VINYL" })}
                                    icon={Disc3}
                                    title="Drehende Vinyl"
                                    desc="Das Cover als Schalplatte, dreht sich beim Abspielen."
                                />
                            </div>
                        </Section>

                        <Section number="02" title="Helligkeit">
                            <p className="text-xs text-black/60">Helligkeit des Displays, in 5%-Schritten.</p>
                            <BrightnessField
                                value={config.brightness}
                                onChange={(brightness) => patchConfig({ brightness })}
                            />
                        </Section>

                        <Section number="03" title="Nachtruhe">
                            <p className="text-xs text-black/60">Das Display zeigt in diesem Zeitraum nicht an, was gerade spielt.</p>

                            <div className="grid grid-cols-2 gap-3">
                                <TimeField
                                    label="Von"
                                    time={config.blackoutWindow?.start || { hour: 0, minute: 0 }}
                                    onChange={(start) =>
                                        patchConfig({ blackoutWindow: { ...config.blackoutWindow, start } })
                                    }
                                />
                                <TimeField
                                    label="Bis"
                                    time={config.blackoutWindow?.end || { hour: 0, minute: 0 }}
                                    onChange={(end) =>
                                        patchConfig({ blackoutWindow: { ...config.blackoutWindow, end } })
                                    }
                                />
                            </div>

                            <Switch
                                id="override"
                                checked={config.blackoutWindow?.override || false}
                                onChange={(override) =>
                                    patchConfig({ blackoutWindow: { ...config.blackoutWindow, override } })
                                }
                                label="Nachtruhe ignorieren"
                                sub="Das Display bleibt immer an."
                            />
                        </Section>

                        <div className="relative">
                            <div className={!config.spotifyApiCredentials.id || !config.spotifyApiCredentials.secretSet ? "blur-sm select-none pointer-events-none" : ""}>
                                <Section number="04" title="Spotify-Konto">
                                    <p className="text-xs text-black/60">
                                        Für das hierdurch autorisierte Spotify-Konto, wird angezeigt, was gerade spielt.
                                    </p>

                                    <AuthorizationStatus authorized={config.spotifyAuthorized} />

                                    <div className="flex flex-col gap-2.5">
                                        <a
                                            href={`${BASE_URL_RGB}/authorize`}
                                            className="inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-black">
                                            <RefreshCw size={15} />
                                            {config.spotifyAuthorized ? "Erneut autorisieren" : "Autorisieren"}
                                        </a>

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

                            {(!config.spotifyApiCredentials.id || !config.spotifyApiCredentials.secretSet) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                                    <div className="border-2 border-black bg-white px-6 py-4 text-center">
                                        <p className="text-sm font-bold uppercase">
                                            Spotify-Konto deaktiviert
                                        </p>
                                        <p className="mt-2 text-xs text-black/60">
                                            Bitte zuerst die Spotify API-Zugangsdaten setzen.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Section number="05" title="Spotify API-Zugangsdaten">
                            <p className="text-xs text-black/60">
                                Client ID und Client Secret der eigenen Spotify-App, benötigt für die Authentifizierung.
                            </p>

                            <label htmlFor="spotifyClientId" className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold uppercase">Client ID</span>
                                <input
                                    id="spotifyClientId"
                                    type="text"
                                    value={clientIdDraft}
                                    onChange={(e) => handleClientIdChange(e.target.value)}
                                    placeholder="z. B. a1b2c3d4e5f6…"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="border-2 border-black bg-white px-3 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:bg-black focus:text-white placeholder:font-normal placeholder:text-black/40 focus:placeholder:text-white/50" />
                            </label>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase">Client Secret</span>
                                    <StatusDot active={config.spotifyApiCredentials.secretSet} label={config.spotifyApiCredentials.secretSet ? "Gesetzt" : "Nicht gesetzt"} />
                                </div>
                                <input
                                    id="spotifyClientSecret"
                                    type="password"
                                    value={secretDraft}
                                    onChange={(e) => handleSecretChange(e.target.value)}
                                    placeholder={config.spotifyApiCredentials.secretSet ? "Neues Secret eingeben, um zu ersetzen" : "Client Secret eingeben"}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="border-2 border-black bg-white px-3 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:bg-black focus:text-white placeholder:font-normal placeholder:text-black/40 focus:placeholder:text-white/50"
                                />
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={clearCredentials}
                                    disabled={!config.spotifyApiCredentials.id && !config.spotifyApiCredentials.secretSet}
                                    className="inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-black"
                                >
                                    <Trash2 size={14} />
                                    Zugangsdaten löschen
                                </button>
                                <a
                                    href="https://developer.spotify.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 border-2 border-black text-sm font-bold px-4 py-2.5 hover:bg-black hover:text-white transition-colors"
                                >
                                    Spotify-App verwalten
                                    <ExternalLink size={14} />
                                </a>
                                <p className="text-[11px] text-black/50 text-center">
                                    Die Spotify-App kann beliebig heißen. Als Redirect-URI muss jedoch unbedingt
                                    https://lerchl.github.io/sophie-matrix-spotify-relay/callback eingetragen werden.
                                    Nach dem Erstellen der App finden sich auf derselben Seite auch die Client ID und
                                    das Client Secret.
                                </p>
                            </div>
                        </Section>

                        <Section number="06" title="Ausschalten">
                            <p className="text-xs text-black/60">
                                Das Display und der Raspberry Pi teilen sich ein Netzteil. Der Pi sollte nicht einfach
                                abgesteckt, sondern sicher heruntergefahren werden. Sobald diese Website nicht mehr
                                erreichbar ist, kann das Netzteil aus der Steckdose gezogen werden. Sobald das Netzteil
                                wieder eingesteckt wird, startet der Pi.
                            </p>

                            {secondStepShutdown ? (
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await fetch(`${BASE_URL_RGB}/shutdown`, { method: "POST" });
                                            } catch (e) {
                                                console.error("Pi konnte nicht heruntergefahren werden:", e);
                                            }
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-red-600 bg-red-600 text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-red-600"
                                    >
                                        <Power size={15} />
                                        Herunterfahren
                                    </button>
                                    <button
                                        onClick={() => setSecondStepShutdown(false)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-black"
                                    >
                                        <X size={15} /> Abbrechen
                                    </button>
                                </div>) : (
                                <div className="flex flex-col gap-2.5">
                                    <button
                                        onClick={() => setSecondStepShutdown(true)}
                                        className="inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-black"
                                    >
                                        <Power size={15} />
                                        Herunterfahren
                                    </button>
                                </div>
                            )}
                        </Section>
                    </div>
                )}
            </main>
        </div>
    );
};
