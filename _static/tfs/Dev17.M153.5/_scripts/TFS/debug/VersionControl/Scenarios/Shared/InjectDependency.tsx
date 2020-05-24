/// <reference types="react" />
import * as React from "react";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

/**
 * Creates a new component for the given render function by passing into it the global TfsContext.
 * @param render The function that renders the original component.
 * Don't forget to assign also the props passed as an argument.
 * @returns A function that creates the new tfsContext-bound component.
 */
export function useTfsContext<P>(render: (tfsContext: TfsContext, props: P) => JSX.Element): React.StatelessComponent<P> {
    return (props: P) => render(TfsContext.getDefault(), props);
}
