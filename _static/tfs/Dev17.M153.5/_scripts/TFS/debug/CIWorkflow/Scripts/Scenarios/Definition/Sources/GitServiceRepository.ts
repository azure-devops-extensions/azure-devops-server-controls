import * as SHCommon from "VSS/Common/Contracts/FormInput";

export class GitServiceRepository {
    public name: string;
    private _url: string;
    public id: string;
    public data: { [key: string]: string; };
    
    constructor(Repo: SHCommon.InputValue) {
        this.name = Repo.displayValue;
        this._url = Repo.value;
        this.data = Repo.data;
    }
}
