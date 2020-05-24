import * as _Spinner from "OfficeFabric/Spinner";

export interface ISearchOverlayProps {
    /**
    * Optional class name added to the Fabric Overlay component.
    */
    className?: string;

    /**
    * Optional spinner size. Default - Large.
    */
    spinnerSize?: _Spinner.SpinnerSize;

    /**
    * Optional spinner text. Default - "Loading..."
    */
    spinnerText?: string;
}