// Encapsulates a TFVC version control path
// This parses properties about the path like the project name, project relative path, etc.
export class TfvcVersionControlPath {

    private static pathRegex: RegExp = /(\$\/([^\/]+))(\/(.*))?/i;
    private static rootPath: string = "$/";

    private projectRoot: string;
    private projectName: string;
    private relativePath: string;
    private isValid: boolean;
    private rawPath: string;

    constructor(path: string) {

        this.isValid = false;
        this.rawPath = path;

        if (path) {
            let regexMatch = path.match(TfvcVersionControlPath.pathRegex);
            if (regexMatch) {

                this.isValid = true;
                this.projectRoot = regexMatch[1];
                this.projectName = regexMatch[2];
                this.relativePath = (typeof regexMatch[4] === "undefined") ? "" : regexMatch[4];
            }
            else if (path === TfvcVersionControlPath.rootPath) {
                this.isValid = true;
            }
        }
    }

    // Begin getters
    public getRawPath(): string {
        return this.rawPath;
    }

    public getIsValid(): boolean {
        return this.isValid;
    }

    public getProjectName(): string {
        return this.projectName;
    }

    public getProjectRoot(): string {
        return this.projectRoot;
    }

    public getRelativePath(): string {
        return this.relativePath;
    }

    //end getters
}