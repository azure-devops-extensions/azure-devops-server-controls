export interface HighlightFragment {
    fieldName: string;

    highlights: string[];
}

export class SnippetFragmentCache {
    private fragmentCache: IDictionaryStringTo<IDictionaryStringTo<HighlightFragment>>;

    constructor() {
        this.fragmentCache = {};
    }

    public get = (key: string) => {
        return this.fragmentCache[key];
    }

    public set = (key: string, value: IDictionaryStringTo<HighlightFragment>) => {
        this.fragmentCache[key] = value;
    }

    public evictCache = () => {
        this.fragmentCache = {};
    }
}