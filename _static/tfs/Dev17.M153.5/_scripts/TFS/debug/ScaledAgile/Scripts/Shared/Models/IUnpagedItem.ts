import {IItemBase} from "ScaledAgile/Scripts/Shared/Models/IItemBase";

/**
 * An item that does not have the full set of work item fields paged in. Just the minimum set of fields needed for the owner's context.
 */
export interface IUnpagedItem extends IItemBase {
}
