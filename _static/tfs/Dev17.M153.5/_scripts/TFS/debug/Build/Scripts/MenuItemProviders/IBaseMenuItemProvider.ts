import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

export interface IBaseMenuItemProvider<T> {
    getAsyncMenuItem(data: T, itemIsAvailable: (item: IContextualMenuItem) => void);
}