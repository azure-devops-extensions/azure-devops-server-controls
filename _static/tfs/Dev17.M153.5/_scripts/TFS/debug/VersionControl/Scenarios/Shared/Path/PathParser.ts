const pathSeparator = "/";
const tfvcRootToken = "$";
const backslashEscapedForRegex = "\\\\";
const regexPathSeparators = new RegExp(pathSeparator + "|" + backslashEscapedForRegex);

/**
 * An utility class to parse path.
 */
export class PathParser {
    public lastPartName: string;
    public folders: string[];
    public isRoot: boolean;
    private rootPartsCount: number;

    constructor(public fullPath: string) {
        this.lastPartName = "";
        if (!fullPath) {
            this.folders = [];
            this.isRoot = true;
            return;
        }

        const pathParts = fullPath.split(regexPathSeparators);
        this.rootPartsCount = this.getRootParts(pathParts);
        this.folders = pathParts.slice(this.rootPartsCount);
        this.isRoot = this.folders.length === 0;
        if (!this.isRoot) {
            this.lastPartName = pathParts[pathParts.length - 1];
            this.folders = this.folders.slice(0, this.folders.length - 1);
        }
    }

    public getFolderPath(index: number): string {
        return this.fullPath &&
            this.fullPath.split(pathSeparator).slice(0, index + this.rootPartsCount + 1).join(pathSeparator);
    }

    public getRootPath(): string {
        if (this.fullPath === "$/") {
            return "$";
        }

        return this.getFolderPath(-1);
    }

    private getRootParts(pathParts: string[]): number {
        let result: number;

        if (pathParts[0] === tfvcRootToken) {
            result = 2;
        } else if(pathParts[0] === "") {
            result = 1;
        } else {
            result = 0;
        }

        if (pathParts[result] === "") {
            result++;
        }

        return result;
    }
}