export interface BuildArtifact {
    /**
     * The projectId.
     */
    projectId: string;
    /**
    * The type of build definition . 1= old build. 2=build vnext. 
    */
    type: number;
    /**
     * The Uri of the definition
     */
    uri: string;
}