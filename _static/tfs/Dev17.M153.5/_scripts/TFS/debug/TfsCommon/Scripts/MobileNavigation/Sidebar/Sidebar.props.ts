import { IBaseProps } from "OfficeFabric/Utilities";

export interface ISidebarProps extends IBaseProps {
    /** Value indicating whether the sidebar is shown right now */
    isOpen: boolean;

    /** Label to display in header */
    headerLabel?: string;

    /** Optional event handler once the sidebar is dismissed */
    onDismiss?: () => void;

    /** Location for brand link in header */
    brandHref?: string;

    /** Location for header link */
    headerHref?: string;
}
