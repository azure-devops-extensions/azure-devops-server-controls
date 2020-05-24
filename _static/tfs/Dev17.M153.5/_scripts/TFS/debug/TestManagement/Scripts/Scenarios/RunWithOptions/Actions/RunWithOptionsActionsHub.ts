import { Action } from "VSS/Flux/Action";

export class RunWithOptionsActionsHub{
    public closeDialog = new Action<void>();
    public onError = new Action<string>();
    public onErrorMessageClose = new Action<void>();
}
