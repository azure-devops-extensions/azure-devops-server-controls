import { INavigationItem } from "TfsCommon/Scripts/MobileNavigation/Navigation/Navigation.props";

export interface INavigationEntryProps {
    items: INavigationItem[];

    /** Id of item to show as selected */
    selectedItemId?: string;

    /** Optional handler to call after navigation happened */
    postNavigation?: (item: INavigationItem) => void;
}
