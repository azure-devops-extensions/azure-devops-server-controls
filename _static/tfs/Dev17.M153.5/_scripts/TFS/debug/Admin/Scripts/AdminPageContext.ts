export class AdminPageContext {
    private static instance: AdminPageContext;

    private pageContext: any;

    private constructor() { }

    private static getInstance(): AdminPageContext {
        if (!this.instance) {
            this.instance = new AdminPageContext();
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