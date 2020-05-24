import { Initializable } from "DistributedTaskControls/Common/Factory";
import { Action as BaseAction } from "VSS/Flux/Action";
import * as ReactPerf from "VSS/Flux/ReactPerf";

export interface IEmptyActionPayload {
}

export interface IActionPayload {
}

export abstract class ActionCreatorBase extends Initializable {
}

export abstract class ActionsHubBase extends Initializable {
}

export class Action<T> extends BaseAction<T> {

    public invoke(payload: T): void {
        ReactPerf.start();

        super.invoke(payload);

        ReactPerf.stop();
        ReactPerf.printWasted(ReactPerf.getLastMeasurements());
    }

}