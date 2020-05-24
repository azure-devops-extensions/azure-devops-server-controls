export class DashboardPageContext {
    private static instance: DashboardPageContext;

    private pageContext: any;

    private constructor() {}

    private static getInstance(): DashboardPageContext {
        if (!this.instance) {
            this.instance = new DashboardPageContext();
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
