import { useCallback, useEffect, useState } from "react";
import { Section, StatusDot } from "./App";
import { Download, } from "lucide-react";
import { BlockedOverlay, type Blocked } from "./Blocked";

export type ReleaseInfoDto = {
    version: string;
    published_at: string | null;
    latest: boolean;
};

export type PaginatedDto<T> = {
    items: T[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
};

export type DeployOutcomeDto = {
    service: string;
    version: string;
};

// The version tracker answers errors with plain text, not an ErrorDto.
const parseTextError = async (res: Response): Promise<string> => {
    try {
        const text = (await res.text()).trim();
        return text || `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
};

type UpdateStatus =
    | { kind: "idle" }
    | { kind: "deploying" }
    | { kind: "success"; version: string }
    | { kind: "error"; message: string };

type ServiceUpdateSectionProps = {
    number: string;
    title: string;
    service: string;
    version?: string;
    baseUrlVersionTracker: string;
};

const PER_PAGE = 30;

export const ServiceUpdateSection = ({ number, title, service, version, baseUrlVersionTracker }: ServiceUpdateSectionProps) => {
    const [releases, setReleases] = useState<ReleaseInfoDto[]>([]);
    const [page, setPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [listLoading, setListLoading] = useState<boolean>(true);
    const [listError, setListError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });

    const loadPage = useCallback(async (nextPage: number) => {
        setListLoading(true);
        setListError(null);
        try {
            const res = await fetch(`${baseUrlVersionTracker}/${service}/versions?page=${nextPage}&per_page=${PER_PAGE}`);
            if (!res.ok) throw new Error(await parseTextError(res));
            const data: PaginatedDto<ReleaseInfoDto> = await res.json();
            setReleases((prev) => (nextPage === 1 ? data.items : [...prev, ...data.items]));
            setPage(data.page);
            setTotalPages(data.total_pages);
        } catch (e) {
            console.error("Versionen konnten nicht geladen werden:", e);
            setListError(e instanceof Error ? e.message : String(e));
        } finally {
            setListLoading(false);
        }
    }, [baseUrlVersionTracker, service]);

    useEffect(() => {
        loadPage(1);
    }, [loadPage]);

    // Preselect the latest release once the list is there, so the select
    // shows what will actually be deployed.
    useEffect(() => {
        if (releases.length === 0) return;
        setSelected((prev) =>
            releases.some((r) => r.version === prev)
                ? prev
                : (releases.find((r) => r.latest) ?? releases[0]).version,
        );
    }, [releases]);

    const deploy = async () => {
        setStatus({ kind: "deploying" });
        try {
            if (!selected) {
                throw new Error("selected is null");
            }

            const res = await fetch(
                `${baseUrlVersionTracker}/${service}/deploy?version=${encodeURIComponent(selected)}`,
                { method: "POST" },
            );
            if (!res.ok) throw new Error(await parseTextError(res));
            const outcome: DeployOutcomeDto = await res.json();
            setStatus({ kind: "success", version: outcome.version });
        } catch (e) {
            console.error("Update fehlgeschlagen:", e);
            setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        }
    };

    const deploying = status.kind === "deploying";

    const latestRelease = releases.find((r) => r.latest);
    const updateAvailable: boolean | undefined =
        latestRelease && version ? latestRelease.version !== version : undefined;

    // No flash of "no versions" before the first load has finished
    const noReleases = releases.length === 0 && !listLoading;

    const versionBlocked: Blocked | null = version ? null : { title: "Version unbekannt" };
    const releasesBlocked: Blocked | null = noReleases
        ? {
            title: listError ? "Versionen nicht verfügbar" : "Keine Versionen"
        }
        : null;
    const updateButtonBlocked: Blocked | null = (() => {
        if (deploying) {
            return { title: "Aktualisiert..." };
        } else if (!selected) {
            return { title: "Keine Version ausgewählt" };
        }

        return null;
    })();
    // Blur only, no text
    const updateInfoBlocked: Blocked | null = updateAvailable === undefined ? {} : null;

    return (
        <Section number={number} title={title}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor={service + "_currentVersion"} className="text-xs font-bold uppercase">
                        Installierte Version
                    </label>
                    <BlockedOverlay blocked={updateInfoBlocked}>
                        <StatusDot
                            active={!!updateAvailable}
                            warn={true}
                            label={updateAvailable ? "Update verfügbar" : "Up to date"}
                        />
                    </BlockedOverlay>
                </div>

                <BlockedOverlay blocked={versionBlocked} compact>
                    <input
                        id={service + "_currentVersion"}
                        type="text"
                        value={version ?? "X.Y.Z"}
                        placeholder="X.Y.Z"
                        autoComplete="off"
                        spellCheck={false}
                        readOnly={true}
                        className="w-full border-2 border-black bg-white px-3 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:bg-black focus:text-white placeholder:font-normal placeholder:text-black/40 focus:placeholder:text-white/50"
                    />
                </BlockedOverlay>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor={service + "_versions"} className="text-xs font-bold uppercase">
                    Versionen
                </label>
                <BlockedOverlay blocked={releasesBlocked} compact>
                    <select
                        id={service + "_versions"}
                        value={selected ?? ""}
                        onChange={(e) => {
                            setSelected(e.target.value);
                            setStatus({ kind: "idle" });
                        }}
                        className="w-full border-2 border-black bg-white px-3 py-2.5 text-sm font-bold focus:outline-none focus:bg-black focus:text-white"
                    >
                        {releases.map((r) => (
                            <option key={r.version} value={r.version}>{r.version}</option>
                        ))}
                    </select>
                </BlockedOverlay>
            </div>

            {listLoading && <p className="text-xs font-bold">Lädt Versionen…</p>}

            {listError && (
                <p className="text-xs font-bold text-red-600">
                    Versionen konnten nicht geladen werden: {listError}
                </p>
            )}

            {!listLoading && page < totalPages && (
                <button
                    onClick={() => loadPage(page + 1)}
                    className="inline-flex items-center justify-center gap-2 border-2 border-black text-sm font-bold px-4 py-2.5 hover:bg-black hover:text-white transition-colors"
                >
                    Ältere Versionen laden
                </button>
            )}

            <BlockedOverlay blocked={updateButtonBlocked}>
                <button
                    onClick={deploy}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-black bg-black text-white text-sm font-bold px-4 py-2.5 transition-colors hover:bg-white hover:text-black"
                >
                    <Download size={15} />
                    Aktualisieren
                </button>
            </BlockedOverlay>

            {status.kind === "success" && (
                <p className="text-xs font-bold">Aktualisiert auf {status.version}.</p>
            )}
            {status.kind === "error" && (
                <p className="text-xs font-bold text-red-600">
                    Update fehlgeschlagen: {status.message}
                </p>
            )}
        </Section>
    );
};
