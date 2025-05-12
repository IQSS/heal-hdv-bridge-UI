import demoConfig from '../config/demo.js';
import prodConfig from '../config/prod.js';

export function loadConfig() {
    const env = window.location.hostname === "heal-hdv.org" ? "prod" : "demo";
    return env === "prod" ? prodConfig : demoConfig;
}