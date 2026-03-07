export declare function writeSpinnerVerbs(verbs: string[]): Promise<void>;
export declare function restoreDefaultVerbs(): Promise<void>;
export declare function installStatusline(config: {
    latitude: number;
    longitude: number;
    method: number;
    school: number;
    city: string;
}): Promise<string>;
export declare function removeStatusline(): Promise<void>;
