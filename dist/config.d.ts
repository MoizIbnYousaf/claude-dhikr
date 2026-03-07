export interface Config {
    latitude: number;
    longitude: number;
    method: number;
    school: number;
    city: string;
}
export declare const METHODS: Record<number, string>;
export declare const SCHOOLS: Record<number, string>;
export declare function readConfig(): Promise<Config>;
export declare function writeConfig(config: Config): Promise<void>;
export declare function configExists(): Promise<boolean>;
