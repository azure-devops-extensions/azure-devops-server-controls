import { Manager, INewable, Initializable } from "DistributedTaskControls/Common/Factory";

export class ActionCreatorManager extends Manager {

    /**
     * Get an instance of the action creator. Use action creator in cases where data needs 
     * to be fetched from source before invoking an action.
     */
    public static GetActionCreator<T extends Initializable>(actionCreatorClass: INewable<T, {}>, instanceId?: string): T {
        return super.getInstance<ActionCreatorManager>(ActionCreatorManager).getObject(actionCreatorClass, instanceId) as T;
    }

    public static CreateActionCreator<T extends Initializable, U>(actionCreatorClass: INewable<T, U>, instanceId: string, args: U): T {
        return super.getInstance<ActionCreatorManager>(ActionCreatorManager).createObject<U>(actionCreatorClass, instanceId, args) as T;
    }

    public static DeleteActionCreator<T extends Initializable>(actionCreatorClass: INewable<T, {}>, instanceId?: string): void {
        super.getInstance<ActionCreatorManager>(ActionCreatorManager).removeObject(actionCreatorClass, instanceId);
    }

    public static dispose() {
        return super.getInstance<ActionCreatorManager>(ActionCreatorManager).dispose();
    }
}