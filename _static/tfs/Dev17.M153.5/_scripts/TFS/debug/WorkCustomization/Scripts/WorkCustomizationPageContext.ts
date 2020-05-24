export class WorkCustomizationPageContext {
    private static instance: WorkCustomizationPageContext;

    private pageContext: any;

    private constructor() { }

    private static getInstance(): WorkCustomizationPageContext {
        if (!this.instance) {
            this.instance = new WorkCustomizationPageContext();
        }
        return this.instance;
    }

    public static getPageContext(): any {
        return this.getInstance().pageContext;
    }

    public static setPageContext(newVal: any) {
        this.getInstance().pageContext = newVal;
    }
}