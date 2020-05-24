import {Action} from "VSS/Flux/Action";
import { HubItemGroup, IHubItem, Direction, ReorderActionPayload } from "MyExperiences/Scenarios/Shared/Models";

export class HubActions {
    private static instance: HubActions;

    /**
     * Singleton action that gets triggered when search filter is changed - passes search query as parameter
     */
    public static get HubFilterAction() { return HubActions.getInstance().hubFilterAction; }

    /**
    * Singleton action that reorders the hubgroup ordering - passes the direction, the index of the group that is being reordered, and all hubgroups as parameter
    */
    public static get HubGroupSwapAction() { return HubActions.getInstance().hubGroupSwapAction; }

    /**
     * Singleton
     */
    public static getInstance(): HubActions {
        if (HubActions.instance == null) {
            HubActions.instance = new HubActions();
        }

        return HubActions.instance;
    }

    private hubFilterAction = new Action<string>();
    private hubGroupSwapAction = new Action<ReorderActionPayload>(); // passes in multi-typed values

    // Public for unit tests only
    public constructor() { }
}