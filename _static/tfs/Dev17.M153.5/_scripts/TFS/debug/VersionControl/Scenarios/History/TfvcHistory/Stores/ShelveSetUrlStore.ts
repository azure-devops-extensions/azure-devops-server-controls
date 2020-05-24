import { Store } from "VSS/Flux/Store";
import * as Navigation_Services from "VSS/Navigation/Services";

export interface ShelveSetsUrlState {
    user?: string;
    userId?: string;
}

export class ShelveSetsUrlStore extends Store {
    public state = {} as ShelveSetsUrlState;    

    public onUrlChange = (parameters: ShelveSetsUrlState): void => {       
            this.state.user = parameters.user;
            this.state.userId = parameters.userId;
            this.emitChanged();
    };
}
