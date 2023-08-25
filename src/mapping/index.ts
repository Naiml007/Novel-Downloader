import Provider from "./impl";
import NovelUpdates from "./impl/novelupdates";

const PROVIDERS: Provider[] = [new NovelUpdates()];
const providers: Record<string, Provider> = PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

export { PROVIDERS, providers };

export type Result = {
    id: string;
    title: string;
    altTitles: string[];
    year: number;
    img: string | null;
    providerId: string;
};

export type Media = {
    id: string;
    title: string;
    coverImage: string | null;
    description?: string;
};
