import type { ReactNode } from "react";

export type Blocked = {
    title?: string;
    message?: string;
};

type BlockedOverlayProps = {
    blocked: Blocked | null;
    /** Single-line label for small elements; shows only the title (and retry) */
    compact?: boolean;
    children: ReactNode;
};

export const BlockedOverlay = ({ blocked, compact = false, children }: BlockedOverlayProps) => {
    const hasText = !!(blocked?.title || blocked?.message);

    return (
        <div className="relative">
            <div
                className={blocked ? "blur-sm select-none pointer-events-none" : ""}
                aria-hidden={!!blocked}
            >
                {children}
            </div>

            {blocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                    {hasText &&
                        (compact ? (
                            <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1 max-w-[95%]">
                                <p className="text-xs font-bold uppercase truncate">
                                    {blocked.title ?? blocked.message}
                                </p>
                            </div>
                        ) : (
                            <div className="border-2 border-black bg-white px-6 py-4 text-center max-w-[90%]">
                                {blocked.title && (
                                    <p className="text-sm font-bold uppercase">{blocked.title}</p>
                                )}
                                {blocked.message && (
                                    <p className="mt-2 text-xs text-black/60 break-words">
                                        {blocked.message}
                                    </p>
                                )}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};
