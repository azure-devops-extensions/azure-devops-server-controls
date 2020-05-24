import * as VSSStore from  "VSS/Flux/Store";

export interface IAccountsStoreState {
    accounts: any[]
}

export class AccountsStore extends VSSStore.Store {
    private state: IAccountsStoreState;
    constructor() {
        super();
        this.state = { accounts: [] };
    }

    /**
     * Updates Store's state to store list of accounts in cross account search scenario.
     * @param filters
     */
    public update(accounts: any[]): void {
        this.state.accounts = accounts;
        this.emitChanged();
    }

    public get accounts(): any[] {
        return this.state.accounts;
    }
}
