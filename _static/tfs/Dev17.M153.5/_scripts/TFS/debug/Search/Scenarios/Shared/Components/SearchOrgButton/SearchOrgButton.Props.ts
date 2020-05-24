export interface ISearchOrgButtonProps {

   /**
    * Invoked upon link click
    */
    onInvoked: (searchText: string) => void;

   /**
    * Text on the button.
    */
    buttonText: string;

   /**
    * icon class name to render
    */
    iconName: string;

   /**
    * search text
    */
    searchText: string;
}
