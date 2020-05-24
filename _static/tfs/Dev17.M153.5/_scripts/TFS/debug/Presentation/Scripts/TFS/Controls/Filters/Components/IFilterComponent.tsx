/**
 * Common base for props of all the individual filter components.
 */
export interface IFilterComponentProps {
    filterKey: string;
    onUserInput: (filterKey: string, value: string) => void;

    //default value of the component
    filterValue?: string;
}