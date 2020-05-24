
import * as ActionBase from "VSS/Flux/Action";

export var CategorySelected = new ActionBase.Action<string>();

export module Creator {
    export function categorySelected(categoryId: string) {
        CategorySelected.invoke(categoryId);
    }
}