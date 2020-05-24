export abstract class SourceBase {

    public static getKey(): string {
        throw new Error("This method needs to be implemented in derived classes");
    }

    private __dispose(): void {
        this.disposeInternal();
    }

    protected disposeInternal(): void {
    }
}