
import { Media, type Result } from "..";
import Http from "./request";

export default abstract class Provider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract useProxies: boolean;

    public customProxy: string | undefined;

    async search(query: string, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    async info(id: string): Promise<Media | undefined> {
        return undefined;
    }

    async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        return undefined;
    }

    async fetchPages(id: string): Promise<string | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest = this.useProxies): Promise<Response> {
        return Http.request(url, config, proxyRequest, 0, this.customProxy);
    }
}

export type Chapter = {
    id: string;
    title: string;
    number: number;
    updatedAt?: number;
};