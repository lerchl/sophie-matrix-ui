export interface ErrorDto {
    message: string;
}

export interface TimeDto {
    hour: number;
    minute: number;
}

export interface BlackoutWindowDto {
    start: TimeDto;
    end: TimeDto;
    override: boolean;
}

export interface SpotifyApiCredentialsViewDto {
    id: null | string,
    secretSet: boolean
}

export interface ConfigurationViewDto {
    brightness: number,
    mode: "FULL" | "VINYL",
    blackoutWindow: BlackoutWindowDto,
    spotifyAuthorized: boolean,
    spotifyApiCredentials: SpotifyApiCredentialsViewDto
}

export interface ConfigurationPatchDto {
    brightness: null | number,
    mode: null | "FULL" | "VINYL",
    blackoutWindow: null | BlackoutWindowDto,
    spotifyApiCredentialsId: null | string,
    spotifyApiCredentialsSecret: null | string
}
