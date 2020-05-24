// Encapsulates a TFVC version control path
// This parses properties about the path like the project name, project relative path, etc.
export class GitVersionControlPath {

    private rawPath: string;
    private isValid: boolean;

    constructor(path: string) {

        this.isValid = true;
        if (!path) {
            this.isValid = false;
        }

        this.rawPath = path;
    }

    public getRawPath(): string {
        return this.rawPath;
    }

    public getIsValid(): boolean {
        return this.isValid;
    }
}